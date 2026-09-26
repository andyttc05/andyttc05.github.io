#!/usr/bin/env python3
"""重型展示面（Noto Sans SC，字重见下面的 WEIGHT）—— 生成子集并写入 fonts.css。

2026-09-25：主人看中一套「小标 / 巨型中文 / 巨型拉丁」三级字阶的设计（UNIFIED GALLERY / 桃之夭夭 /
GALLERY）。那套的巨字是 Black 级重量，而**这台机器上没有 Black 级中文**：
Hiragino Sans GB 只到 W6、STHeiti 只有 Light/Medium、PingFang SC 最重只到 Semibold。
拿 font-weight 去写只会得到浏览器**合成加粗**（机械加宽笔画，糊而不匀），
所以必须自托管一份真 Black 面 —— 与站内自托管 IBM Plex 的路子一致。

2026-09-25 第二轮：单册页与墙页各加了一行**展示蓝的巨型拉丁**（本册英文名 / GALLERY）。
那一行也走这支面，所以子集里必须含 A-Z 与那几个标点。拉丁只在渲染层被
`text-transform: uppercase` 转大写，所以**只收大写**，小写字母不进子集（省二十几个字形）。
⇒ 收字符时对含拉丁的来源做 `.upper()`：CJK 无大小写，做与不做一样。

2026-09-26：主人「标题有点太厚了」⇒ 字重 **900 Black → 700 Bold**。
字重不再硬编码，收成 `WEIGHT` 一个常量 —— 文件名 / wght 参数 / @font-face 三处都由它派生。

为什么走 Google Fonts 的 `text=` 接口而不是自己 subset 一个完整字库：
  ① 官方接口直接给「只要这些字」的 woff2，不再需要维护一份源字库；
  ② 实测 `@fontsource/noto-sans-sc` 的 `chinese-simplified` 分片**缺字**
     —— 大澳那句「棚屋挨着水，舢舨停在门口」的「舢」(U+8222)「舨」(U+8228) 都不在里面，
     而官方接口给的分片两个都在。缺字不会报错，只会在巨字里掉回系统字体、字重突变。
  ③ 体量：官方 258 字 = **38.0 KB**；同一份字库放宽到 GB2312 一级（3755 字）= 514 KB。

用法：
    python3 tools/display-font.py            # 只检查，打印会变什么
    python3 tools/display-font.py --write    # 真的下载并改 fonts.css

⚠️ 加相簿 / 改册名 / 改任何一页的 <h1> 之后**要重跑一次**，否则新字不在子集里，
   会在巨字中间掉回系统字体。脚本自己会比对"站点需要的字"与"子集覆盖的字"，
   缺一个就拒绝写入 —— 所以忘了重跑的代价是"跑一次报错"，不是"线上静默变丑"。
⚠️ 它写的是 fonts.css，而 fonts.css 是**盖章资源**：
   改完记得 `node tools/stamp.mjs --write`，否则 26 页的 `?v=` 和文件对不上。

⚠️ 脚本末尾会把拉丁字形的**字宽表**（em 为单位）打出来。那张表被 `tools/photos-data.py`
   抄了一份，用来算"拉丁行的块要多大才能跟汉字那块一样宽"。字库换了就重跑本脚本、把表换掉。
"""

import argparse
import glob
import hashlib
import html
import pathlib
import re
import sys
import urllib.parse
import urllib.request

REPO = pathlib.Path(__file__).resolve().parent.parent
FONTS_CSS = REPO / "assets" / "css" / "fonts.css"

# 🔴 巨字的字重（唯一真相源）。900 = Black / 800 = ExtraBold / 700 = Bold / 600 = SemiBold。
#    2026-09-26 从 900 降到 700（主人「标题有点太厚了」）。
#    改这个数会连带换掉字体文件名与 fonts.css 里那一段 —— 改完必须重跑本脚本，
#    再 `node tools/stamp.mjs --write`（fonts.css 是盖章资源）。
WEIGHT = 700
WOFF2_NAME = f"noto-sans-sc-{WEIGHT}-normal.cjk-display.woff2"
OUT_WOFF2 = REPO / "assets" / "fonts" / WOFF2_NAME

BEGIN = "/* >>> display-face:begin >>> */"
END = "/* >>> display-face:end >>> */"

# 巨字层实际渲染的字符串来源。**只收展示层的字**，不是全站可见文字：
# 子集越小越好，而这个字体只喂巨型中文与巨型拉丁那两层。
# 第三个字段 = 收字符时是否转大写（含拉丁的来源才需要）。
# ⚠️ 收得太窄的代价是"新册名掉字"，收得太宽的代价是文件变大（GB2312 一级 = 514 KB，不值）。
SOURCES = [
    # 单册页：册名（巨字）/ 地区小标 / 一句话描述
    ("pages/albums/*.html", r'<h1 class="album-title">(.*?)</h1>', False),
    ("pages/albums/*.html", r'<p class="album-eyebrow">(.*?)</p>', False),
    ("pages/albums/*.html", r'<p class="about-hero-desc">(.*?)</p>', False),
    # 单册页：展示蓝的英文名（渲染层转大写 ⇒ 只收大写）
    ("pages/albums/*.html", r'<p class="title-latin">(.*?)</p>', True),
    # 四个内容页的页名（本猫来啦 / 猫窝工坊 / 雨落笔记 / 旧时留影）；
    # 墙页那支 <h1> 里还夹着一行展示蓝的 GALLERY，所以这一路也要转大写。
    ("pages/about.html", r"<h1[^>]*>(.*?)</h1>", False),
    # 2026-09-26：这两页也照墙页加了 <span class="title-latin">Projects / Posts</span>，
    # 渲染层 text-transform:uppercase ⇒ 与 photos.html 一样转大写收字。
    ("pages/projects.html", r"<h1[^>]*>(.*?)</h1>", True),
    ("pages/posts.html", r"<h1[^>]*>(.*?)</h1>", True),
    ("pages/photos.html", r"<h1[^>]*>(.*?)</h1>", True),
]

# 巨字旁边要一起排的符号与数字。拉丁那一行是本轮加的（& 、逗号、冒号、弯撇号）。
# 空格必须留 —— 英文名里一堆空格，缺了它整行会掉回系统字体。
EXTRA = " ・、，。—·0123456789 &,:.’'/-"

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120 Safari/537.36"
)

# 拉丁字宽表只统计这些码位（其余是 CJK，一律 1em，不必进表）
LATIN_MAX = 0x2E80


def collect_strings():
    out = set()
    for pattern, regex, upper in SOURCES:
        for path in sorted(glob.glob(str(REPO / pattern))):
            text = pathlib.Path(path).read_text(encoding="utf-8")
            for match in re.findall(regex, text, re.S):
                clean = html.unescape(re.sub(r"<[^>]+>", "", match)).strip()
                if clean:
                    out.add(clean.upper() if upper else clean)
    return out


def unicode_range(codepoints):
    """把码点集合压成最简 unicode-range 串（连续区间合并）。"""
    pts = sorted(codepoints)
    runs, start, prev = [], pts[0], pts[0]
    for p in pts[1:]:
        if p == prev + 1:
            prev = p
            continue
        runs.append((start, prev))
        start = prev = p
    runs.append((start, prev))
    return ", ".join(
        f"U+{a:X}" if a == b else f"U+{a:X}-{b:X}" for a, b in runs
    )


def fetch_subset(text):
    url = (
        f"https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@{WEIGHT}&text="
        + urllib.parse.quote(text)
    )
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    css = urllib.request.urlopen(request, timeout=60).read().decode()
    found = re.search(r"url\((https://fonts\.gstatic\.com[^)]+)\)", css)
    if not found:
        sys.exit("Google Fonts 没有返回 woff2 地址 —— css 内容：\n" + css[:400])
    request = urllib.request.Request(found.group(1), headers={"User-Agent": UA})
    return urllib.request.urlopen(request, timeout=120).read()


def latin_metrics(font, chars):
    """量出拉丁字形的**字宽**（em，也就是"一个字占多少个字号"）。

    为什么不用「字数 × 平均值」估：`TAI O` 里有个窄 I、两个空格，
    `HKUST` 全是宽字母，同一个"5 个字符"实际宽度差 30% —— 而这张表是用来
    把拉丁那一行的块宽算到与汉字那块**逐像素相等**的，估出来的值等于白算。"""
    upem = font["head"].unitsPerEm
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    out = {}
    for c in sorted(chars):
        cp = ord(c)
        # U+2E80 以上是 CJK / 全角标点，与汉字一样各占 1em，不必进表
        if cp >= LATIN_MAX:
            continue
        name = cmap.get(cp)
        if name is None:
            continue
        out[c] = round(hmtx[name][0] / upem, 4)
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()

    strings = collect_strings()
    chars = set().union(*map(set, strings)) | set(EXTRA)
    print(f"展示层字符串 {len(strings)} 条 · 去重字符 {len(chars)} 个")

    blob = fetch_subset("".join(sorted(chars)))
    print(f"下载子集 {len(blob) / 1024:.1f} KB · sha256 {hashlib.sha256(blob).hexdigest()[:16]}")

    # 覆盖自检：拿回来的字体必须真的含每一个字。
    # 少一个就中止 —— 缺字在页面上只是"某个字突然换了个字重"，肉眼极易漏掉。
    import io

    from fontTools.ttLib import TTFont

    font = TTFont(io.BytesIO(blob))
    covered = set(font.getBestCmap())
    missing = sorted(c for c in chars if ord(c) not in covered)
    if missing:
        sys.exit(f"子集缺字，拒绝写入：{''.join(missing)}")
    print(f"覆盖自检：{len(covered)} 个码位，展示层需要的字一个不缺 ✅")

    block = (
        f"{BEGIN}\n"
        "/* 巨型展示面（2026-09-25）。生成器：tools/display-font.py —— 改完册名 / 页名要重跑。\n"
        "   选它是因为这台机器上**没有**足够重的中文面（Hiragino Sans GB 到 W6、STHeiti 只有\n"
        "   Light/Medium、PingFang SC 到 Semibold），写重字重只会拿到合成加粗。\n"
        f"   字重 {WEIGHT}（2026-09-26 从 900 降到 700：主人「标题有点太厚了」）。\n"
        "   中文与拉丁两层巨字都吃这一支，所以 unicode-range 里同时含 CJK 与 A-Z。\n"
        f"   {len(covered)} 个码位 / {len(blob) / 1024:.1f} KB。unicode-range 就是这份子集的真实覆盖，\n"
        "   不在范围内的字按栈继续往下落（不会白拉这个文件）。\n"
        "   ⚠️ 体量取舍：放宽到 GB2312 一级（3755 字）是 514 KB，而展示层只需要两百多个字。\n"
        "   代价是加新相簿要重跑生成器 —— 它会自己比对缺字并拒绝写入，所以漏跑会报错、不会静默变丑。 */\n"
        "@font-face {\n"
        "  font-family: 'Noto Sans SC Display';\n"
        "  font-style: normal;\n"
        f"  font-weight: {WEIGHT};\n"
        "  font-display: swap;\n"
        f"  src: url('../fonts/{WOFF2_NAME}') format('woff2');\n"
        f"  unicode-range: {unicode_range(covered)};\n"
        "}\n"
        f"{END}\n"
    )

    css = FONTS_CSS.read_text(encoding="utf-8")
    if BEGIN in css:
        css = re.sub(
            re.escape(BEGIN) + r".*?" + re.escape(END) + r"\n",
            block,
            css,
            flags=re.S,
        )
        action = "替换"
    else:
        css = css.rstrip("\n") + "\n\n" + block
        action = "追加"
    print(f"fonts.css：{action} display-face 块")

    same_font = OUT_WOFF2.exists() and OUT_WOFF2.read_bytes() == blob
    print("字体文件：" + ("字节相同，无需改动" if same_font else "内容有变"))
    print("CSS 块：  " + ("相同" if block in FONTS_CSS.read_text(encoding='utf-8') else "有变"))

    metrics = latin_metrics(font, chars)
    print(f"\n拉丁字宽表（em，共 {len(metrics)} 个码位）—— 抄给 tools/photos-data.py：")
    line, width = "    ", 0
    for c, v in metrics.items():
        piece = f'"{c}": {v}, '
        if width + len(piece) > 96:
            print(line.rstrip())
            line, width = "    ", 0
        line += piece
        width += len(piece)
    if width:
        print(line.rstrip())

    if not args.write:
        print("\n（dry-run，没有写入。加 --write 才落盘）")
        return

    OUT_WOFF2.write_bytes(blob)
    FONTS_CSS.write_text(css, encoding="utf-8")
    print(f"\n已写入 {OUT_WOFF2.relative_to(REPO)} 与 {FONTS_CSS.relative_to(REPO)}")
    print("⚠️ 下一步：node tools/stamp.mjs --write")


if __name__ == "__main__":
    main()
