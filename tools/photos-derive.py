#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从相簿原图（HEIC/JPG）生成网页用的 WebP 衍生档。

为什么需要这一步：浏览器基本不渲染 HEIC（只有 Safari 认），原图 4–6 MB 也不适合直接上网页。
所以每个相簿目录里留一份原图（归档，不进 git），旁边生成两档 WebP：

    assets/photos/<album>/<YYYYMMDD-HHMMSS>.webp         view   长边 1440，灯箱用
    assets/photos/_thumbs/<album>/<YYYYMMDD-HHMMSS>.webp thumb  长边 900，相簿墙/宫格用

两档尺寸的取舍：缩略图 900 是为了在 2x 屏上做相簿封面不糊（卡面 ~450px 宽），
而灯箱 1440 够在笔记本全屏看又不至于让仓库膨胀。

⚠️ 生成的 webp **不 commit**（.gitignore 挡着）。站点读的是 Cloudflare R2，
本脚本跑完要接着 `bash tools/photos-sync.sh` 上传，否则线上还是旧的 ——
地址写在 assets/js/photos.js 的 CDN / CDN_V 两行，重做后内容变了就把 CDN_V 加一。

用法：
    python3 tools/photos-derive.py            # 增量：只做缺的/过期的
    python3 tools/photos-derive.py --force    # 全量重做
    python3 tools/photos-derive.py --jobs 8   # 并发（默认 = CPU 核数）

依赖：ImageMagick 7 的 `magick`（HEIC 支持来自 libheif）。
"""
import argparse
import json
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHOTOS = os.path.join(ROOT, "assets", "photos")
THUMBS = os.path.join(PHOTOS, "_thumbs")

VIEW_EDGE, VIEW_Q = 1440, 78
THUMB_EDGE, THUMB_Q = 900, 72


def magick():
    for exe in ("magick", "/opt/homebrew/bin/magick", "/usr/local/bin/magick"):
        try:
            subprocess.run([exe, "-version"], capture_output=True, check=True)
            return exe
        except (OSError, subprocess.CalledProcessError):
            continue
    sys.exit("找不到 magick（ImageMagick 7）。装一个：brew install imagemagick")


def encode(exe, src, dst, edge, quality):
    """-auto-orient 必须最先做：iPhone 的 HEIC 普遍靠 EXIF Orientation 摆正，
    不烘进像素的话 WebP 出来会是躺着的。"""
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    # 临时名必须**保留 .webp 后缀**：ImageMagick 靠扩展名判断输出格式，
    # 写成 `xxx.webp.tmp` 它会认不出格式、退回按源格式（HEIC）写，
    # 结果就是「名为 .webp、其实是 HEIC、还大 3 倍」的假货。踩过一次，别再改回去。
    tmp = dst[:-len(".webp")] + ".tmp.webp" if dst.endswith(".webp") else dst + ".tmp.webp"
    r = subprocess.run(
        [exe, src, "-auto-orient", "-resize", f"{edge}x{edge}>",
         "-quality", str(quality), "-define", "webp:method=6",
         "-define", "webp:exact=true", "-strip", tmp],
        capture_output=True,
    )
    if r.returncode != 0 or not os.path.exists(tmp):
        return False, (r.stderr or b"").decode("utf-8", "replace")[:200]
    # 光看"命令成功"不够 —— 必须验字节。只认 RIFF????WEBP 这个魔数，
    # 否则又会出现"文件名叫 .webp、内容却是别的格式"这种静默错误。
    with open(tmp, "rb") as fh:
        head = fh.read(12)
    if not (head[:4] == b"RIFF" and head[8:12] == b"WEBP"):
        os.remove(tmp)
        return False, f"输出不是 WebP（魔数 {head[:12]!r}）"
    os.replace(tmp, dst)
    return True, ""


def stale(src, dst):
    return not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--jobs", type=int, default=min(8, (os.cpu_count() or 4)))
    args = ap.parse_args()

    exe = magick()
    man = json.load(open(os.path.join(PHOTOS, "manifest.json")))
    jobs = []
    src_gone = 0        # 原图不在本地、两份 webp 齐 —— 2026-09-23 起这是常态
    src_gone_bad = []   # 原图没了、webp 也缺 —— 这才要处理
    for al in man["albums"]:
        slug = al["slug"]
        for ph in al["photos"]:
            base = os.path.splitext(ph["file"])[0]
            src = os.path.join(PHOTOS, slug, ph["file"])
            view_dst = os.path.join(PHOTOS, slug, base + ".webp")
            thumb_dst = os.path.join(THUMBS, slug, base + ".webp")
            if not os.path.exists(src):
                # 原图不入库（主人 2026-09-23「我只要保留 webp」）⇒ 缺原图是正常状态，
                # 别再一张一张刷 "缺原图"，那只是噪音。真缺 webp 才报。
                if os.path.exists(view_dst) and os.path.exists(thumb_dst):
                    src_gone += 1
                else:
                    src_gone_bad.append(src)
                continue
            for dst, edge, q in (
                (view_dst, VIEW_EDGE, VIEW_Q),
                (thumb_dst, THUMB_EDGE, THUMB_Q),
            ):
                if args.force or stale(src, dst):
                    jobs.append((src, dst, edge, q))

    if src_gone:
        print(f"原图不在本地、webp 齐备：{src_gone} 张（正常）。"
              f"要重做 webp 先 python3 tools/photos-originals.py --restore")
    for s in src_gone_bad:
        print(f"  ❌ 原图与 webp 都缺：{os.path.relpath(s, ROOT)}")
    if args.force and src_gone:
        print(f"⚠️  --force 但原图不在，这 {src_gone} 张无法重编码（先 --restore）")

    total = len(jobs)
    print(f"待编码 {total} 个（并发 {args.jobs}）", flush=True)
    if not total:
        print("全部已是最新")
        return

    done = [0]
    fails = []

    def work(job):
        src, dst, edge, q = job
        ok, err = encode(exe, src, dst, edge, q)
        if not ok:
            fails.append((src, err))
        done[0] += 1
        if done[0] % 25 == 0 or done[0] == total:
            print(f"  {done[0]}/{total}", flush=True)

    with ThreadPoolExecutor(max_workers=args.jobs) as pool:
        list(pool.map(work, jobs))

    if fails:
        print(f"\n失败 {len(fails)} 个：")
        for s, e in fails[:10]:
            print("  ", os.path.basename(s), e)
        sys.exit(1)
    print("DONE", total)


if __name__ == "__main__":
    main()
