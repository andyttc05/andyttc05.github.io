#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""相簿原图的「出处 → 还原」工具。

背景（2026-09-23）：`assets/photos/` 里的原图（268 张 heic/jpg，590 MB）已按主人
「我只要保留 webp」的要求清掉，只留 WebP 两档 + manifest。但那些原图并不是孤本 ——
它们是下面两个源目录的**字节级副本**，只是被改名成拍摄时间戳：

    ~/Downloads/Photo   272 张（2026-09-21 分类导入的源批次）
    ~/Downloads/PolyU     7 张（2026-09-23 理大那批）

对照关系已经用 sha256 验过：**279/279 全部命中，0 个孤立**
（268 张在册 + 11 张 `_duplicates/` = 279 = 272 + 7）。

所以「还原」= 按 EXIF `DateTimeOriginal` 把时间戳名翻回源目录里的 IMG_xxxx，
再把字节复制回来。**不重新编码**（来源就是 HEIC 原件，重编码会掉一代）。

用法：
    python3 tools/photos-originals.py --check            # 只查：每张在册照片都找得到出处吗
    python3 tools/photos-originals.py --restore           # 还原进 assets/photos/<slug>/
    python3 tools/photos-originals.py --restore --out /tmp/x   # 还原到别处（不碰工作区）
    python3 tools/photos-originals.py --restore --slugs polyu  # 只还原某几本

⚠️ 两个前提，缺一个这工具就失效：
   1. `~/Downloads/Photo` 与 `~/Downloads/PolyU` **还在**。要清理它们之前，
      先 `--restore` 把 590 MB 原图拉回仓库或别的归档目录。
   2. 相簿里的时间戳名 = 拍摄时刻（第 6 步命名规则）。同一秒两张会被命名规则撞开，
      撞开的那种这里对不上 —— `--check` 会列出来，别忽略它的输出。
"""

import argparse
import json
import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, "assets", "photos", "manifest.json")
PHOTOS = os.path.join(ROOT, "assets", "photos")

SOURCES = [
    os.path.expanduser("~/Downloads/Photo"),
    os.path.expanduser("~/Downloads/PolyU"),
]
EXTS = (".heic", ".HEIC", ".jpg", ".JPG", ".jpeg", ".JPEG")


def exif_stamp(path):
    """EXIF DateTimeOriginal → 'YYYYMMDD-HHMMSS'（就是相簿的文件名）。取不到回 None。"""
    try:
        out = subprocess.run(
            ["magick", "identify", "-format", "%[EXIF:DateTimeOriginal]", path],
            capture_output=True, text=True, timeout=60,
        ).stdout.strip()
    except Exception:
        return None
    if not out or ":" not in out:
        return None
    # '2024:09:28 19:36:02' → '20240928-193602'
    try:
        d, t = out.split(" ", 1)
        return d.replace(":", "") + "-" + t.replace(":", "")
    except ValueError:
        return None


def build_index():
    """源目录 → {时间戳: [路径,…]}。同一秒有多个就都留着，冲突时由调用方报出来。"""
    idx = {}
    for d in SOURCES:
        if not os.path.isdir(d):
            print(f"⚠️  源目录不存在，跳过：{d}", file=sys.stderr)
            continue
        for f in sorted(os.listdir(d)):
            p = os.path.join(d, f)
            if not (os.path.isfile(p) and f.endswith(EXTS)):
                continue
            s = exif_stamp(p)
            if s:
                idx.setdefault(s, []).append(p)
    return idx


def load_photos(slugs=None):
    data = json.load(open(MANIFEST, encoding="utf-8"))
    for al in data["albums"]:
        if slugs and al["slug"] not in slugs:
            continue
        for ph in al["photos"]:
            # 还原要落成**相簿里的名字**（时间戳 + 原扩展名），不是源目录的 IMG_xxxx，
            # 否则放回去 photos-derive.py / manifest 都对不上。
            yield al["slug"], os.path.splitext(ph["file"])[0], ph["file"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="只核对出处，不写任何文件")
    ap.add_argument("--restore", action="store_true", help="把原图复制回相簿目录")
    ap.add_argument("--out", default=None, help="还原到别处（默认 assets/photos/<slug>/）")
    ap.add_argument("--slugs", default=None, help="逗号分隔，只处理这几本")
    a = ap.parse_args()
    if not (a.check or a.restore):
        ap.error("给一个 --check 或 --restore")

    slugs = [s.strip() for s in a.slugs.split(",")] if a.slugs else None
    idx = build_index()
    print(f"源目录索引：{len(idx)} 个时间戳（{sum(len(v) for v in idx.values())} 个文件）")

    hit = miss = dup = 0
    missing, ambiguous = [], []
    for slug, base, fname in load_photos(slugs):
        cands = idx.get(base, [])
        if not cands:
            miss += 1
            missing.append(f"{slug}/{base}")
            continue
        if len(cands) > 1:
            dup += 1
            ambiguous.append(f"{slug}/{base} → {[os.path.basename(c) for c in cands]}")
            continue
        hit += 1
        if a.restore:
            dst_dir = os.path.join(a.out, slug) if a.out else os.path.join(PHOTOS, slug)
            os.makedirs(dst_dir, exist_ok=True)
            dst = os.path.join(dst_dir, fname)
            if os.path.exists(dst) and os.path.getsize(dst) == os.path.getsize(cands[0]):
                continue
            shutil.copy2(cands[0], dst)

    print(f"对得上：{hit}　对不上：{miss}　同一秒多个候选：{dup}")
    for x in missing[:20]:
        print("   ❌ 找不到出处：", x)
    for x in ambiguous[:20]:
        print("   ⚠️  需要人判：", x)
    if a.restore:
        print(f"已还原到：{a.out or PHOTOS}")
    sys.exit(0 if miss == 0 else 1)


if __name__ == "__main__":
    main()
