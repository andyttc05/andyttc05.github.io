#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从 assets/photos/manifest.json 产出相簿相关的**全部**静态产物。

2026-09-25 起这个脚本同时管两件事：

  ① 数据：assets/js/photos-data.js（网页不再直接引它，但它是机器可读的相簿索引 ——
     生成器自己与 stamp.mjs 的一致性守卫都读它，字段也留着给以后做筛选）。
  ② 页面（方案 B 静态化）：
       · pages/photos.html    的相簿数据条 + 19 张封面磁贴
       · pages/albums/<slug>.html  每个相簿一页（书名/元信息/每一张照片/上一册下一册）
     为什么内容必须进 HTML：跨文档 View Transition 取新页快照于 pagereveal（实测 52~270ms），
     而 defer 的 photos.js 跑到 DCL（258~414ms）⇒ 快照拍到的是空壳，整页被洗白。
     证据与推导：~/.workbuddy/scratch/photo-flash-2026-09-25/report-photo-flash.html。

  ⚠️ 注入是**按标记替换、幂等**的：只换 `RM-BEGIN 名字` 与 `RM-END 名字` 之间的内容，
     标记本身留着 ⇒ 反复跑同一份输出不变，也不会碰你手写在别处的字。
  ⚠️ 单册页是从 pages/album.html（＝模板 + 老网址路由器）**派生**的，不是另起一份骨架 ——
     这样启动片段（nav-instant / speculationrules / load+2s 兜底 / 幕布）天然逐字节相同。
  ⚠️ 内联代码（assets/js/plate.js 与 album-strip.js）是**逐字节抄进去**的：
     图片交接与对齐行几何都必须在解析期、零网络完成，见那两个文件开头的说明。
     tools/stamp.mjs 的 INLINE 检查会比对副本与源文件，改了源忘了重跑就会红。

封面（cover）是人工挑的：先把每个相簿按「横构图优先 × 分辨率」排前 6 名做成对照图，
人眼从里面挑一张，挑选结果记在 COVER_RANK 里（数字 = 名次，从 1 数起）。
相簿描述（NOTE）同样是手写的 —— 这两样是内容，不该让脚本猜。

用法：
    python3 tools/photos-data.py            # 生成数据 + 页面（默认）
    python3 tools/photos-data.py --data     # 只生成数据（不动页面）
"""
import html
import json
import os
import re
import sys
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHOTOS = os.path.join(ROOT, "assets", "photos")
OUT = os.path.join(ROOT, "assets", "js", "photos-data.js")
SHELL = os.path.join(ROOT, "pages", "album.html")      # 单册页模板（+ 老网址路由器）
WALL = os.path.join(ROOT, "pages", "photos.html")      # 相簿墙
ALBUMS_DIR = os.path.join(ROOT, "pages", "albums")

# 每个相簿挑中的封面名次（1 起算，对应「横构图优先 × 分辨率」排序的前 6 名）
COVER_RANK = {
    "shek-kip-mei": 2,        # 蓝天下那排公屋
    "yaumatei-mongkok": 1,    # 红招牌 + 「香港我爱你」
    "tsim-sha-tsui": 2,       # 李小龙铜像
    "hung-hom": 4,            # 那栋弯弯的玻璃楼
    "kai-tak": 4,             # 跑道尽头看日落
    "central-wanchai": 1,     # 仰拍的玻璃幕墙
    "victoria-peak": 2,       # 维港全景
    "braemar-hill": 1,        # 金督驰马径的日落
    "island-south": 2,        # 赤柱那栋殖民楼
    "hkust": 1,               # 红鸟雕塑
    "tseung-kwan-o": 3,       # 跨湾大桥夜景
    "tai-o": 1,               # 棚屋与舢舨
    "disneyland": 5,          # 夜里亮灯的城堡
    "northwest-nt": 3,        # 草地上那几头牛
    "tai-po-shatin": 5,       # 城门河上的赛艇
    "shenzhen-baoan": 3,      # 宝安那栋几何立面
    "shenzhen-urban": 3,      # 夜里发光的商场
    "hengqin": 3,             # 鲸鲨馆
    # 下面这本用文件名指定（评分前 6 全是"从校园俯拍的城市"，看着不像学校）
    "polyu": "20260919-161522.heic",   # 图书馆门口那排 POLYU 大字
}

# 每个相簿一句话（手写，别改成模板腔）
NOTE = {
    "shek-kip-mei": "公屋、旧街、茶餐厅，一条街走到底",
    "yaumatei-mongkok": "招牌比人多，抬头全是霓虹",
    "tsim-sha-tsui": "海边那条道，天黑以后最好看",
    "hung-hom": "学校、车站，还有那栋绕不出去的弯楼",
    "kai-tak": "旧跑道上看日落，风挺大",
    "central-wanchai": "玻璃幕墙的反光，抬头就有一张",
    "victoria-peak": "上去一趟，维港整个摊在脚下",
    "braemar-hill": "为了那场日落爬上去的",
    "island-south": "龙脊走一遭，赤柱歇一脚",
    "hkust": "上课路上抬头就是海",
    "tseung-kwan-o": "桥、单车、海边，慢慢逛",
    "tai-o": "棚屋挨着水，舢舨停在门口",
    "disneyland": "一年去一趟，还是会拍城堡",
    "northwest-nt": "田、牛、湿地，香港的另一面",
    "tai-po-shatin": "城门河划船，铁路边上走",
    "shenzhen-baoan": "过了关先看楼，再说吃的",
    "shenzhen-urban": "商场和夜街，逛到腿软",
    "hengqin": "鲸鲨从头顶游过去",
    "polyu": "红砖、弯楼，门口那几个大字",
}

# 照片出货域名与盖版本号（与 assets/js/photos.js 里那两行必须一致）
CDN = "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/photos"
CDN_V = "?v=1"

# 墙上头 4 张封面不等懒加载（否则一进页面滚下来一片灰）
WALL_EAGER = 4
# 单册页照片墙头 12 张不等懒加载（对齐 rows2layout 的行高，视口内通常两三行）
STRIP_EAGER = 12


def esc(s):
    return html.escape(s or "", quote=True)


def stamp(s):
    """2024-01-13 14:34:44 → 2024.01.13（只到日，与 photos.js 的 stamp() 同规则）"""
    return s[:10].replace("-", ".") if s else ""


def ar_str(w, h):
    """长宽比写成 CSS 数字：1.3333 / 0.75（引擎与兜底 CSS 都读它）"""
    v = f"{(w / h) if h else 1.0:.4f}".rstrip("0").rstrip(".")
    return v or "1"


def view_url(slug, base):
    return f"{CDN}/{slug}/{base}.webp{CDN_V}"


def thumb_url(slug, base):
    return f"{CDN}/_thumbs/{slug}/{base}.webp{CDN_V}"


def rank_cover(photos, rank):
    """跟 /tmp/covers/pick.py 用同一套评分，保证挑出来的就是当初看到的那张。

    rank 一般是名次（int，从「横构图优先 × 分辨率」前 6 名里数）。
    也接受文件名（带不带扩展名都行）—— 当评分前 6 名里没有一张适合当封面时用它，
    比分名前 6 全是"从校园俯拍的城市"、看着不像学校那种情况。
    """
    if isinstance(rank, str):
        for p in photos:
            if p["file"] == rank or os.path.splitext(p["file"])[0] == rank:
                return p
        raise KeyError(f"COVER_RANK 指定了相簿里没有的文件：{rank}")

    def score(p):
        ar = p["width"] / p["height"] if p["height"] else 1.0
        land = 1.0 if ar >= 1.15 else (0.55 if ar >= 0.9 else 0.3)
        return p["width"] * p["height"] * land
    ordered = sorted(photos, key=score, reverse=True)[:6]
    return ordered[min(rank, len(ordered)) - 1]


# --------------------------------------------------------------- 1. 数据
def build_albums(man):
    albums = []
    for al in man["albums"]:
        slug = al["slug"]
        cover = rank_cover(al["photos"], COVER_RANK[slug])
        albums.append({
            "slug": slug,
            "zh": al["name_zh"],
            "en": al["name_en"],
            "region": al["region"],
            "count": al["count"],
            "first": al["first"],
            "last": al["last"],
            "note": NOTE.get(slug, ""),
            # 文件名去掉扩展名即可 —— view 与 thumb 用同一个 basename，只是目录不同
            "cover": os.path.splitext(cover["file"])[0],
            "photos": [
                [os.path.splitext(p["file"])[0], p["width"], p["height"],
                 p["caption"], p["taken_at"]]
                for p in al["photos"]
            ],
        })
    return albums


def build_data(albums):
    regions = []
    for al in albums:
        if al["region"] not in regions:
            regions.append(al["region"])
    return {
        "generated": datetime.now().astimezone().strftime("%Y-%m-%d %H:%M %z"),
        "generatedNote": "由 tools/photos-data.py 从 assets/photos/manifest.json 生成，不要手改",
        "stats": {
            "albums": len(albums),
            "photos": sum(a["count"] for a in albums),
            "regions": len(regions),
            "first": min(a["first"] for a in albums),
            "last": max(a["last"] for a in albums),
        },
        "albums": albums,
    }


def write_data_js(data):
    body = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write("/* 相簿数据：由 tools/photos-data.py 生成，手改会在下次生成时被覆盖。\n"
                 "   为什么是 .js 不是 .json：本地用 file:// 打开页面时 fetch 本地 json 会被 CORS 拦，\n"
                 "   挂到 window 上就没这问题。\n"
                 "   ⚠️ 2026-09-25 方案 B 静态化之后，两个相簿页**不再引这个文件** ——\n"
                 "   内容已经在 HTML 里、照片清单也从 DOM 读。它现在是机器可读的相簿索引\n"
                 "   （生成器与 tools/stamp.mjs 的一致性守卫读它），字段留着给以后做筛选。 */\n")
        fh.write("window.RM_PHOTOS = ")
        fh.write(body)
        fh.write(";\n")


# --------------------------------------------------------- 2. 标记与注入
def _mark(kind, name):
    return re.compile(r"<!--RM-" + kind + r" " + re.escape(name) + r"-->", re.S)


def get_region(src, name):
    m0, m1 = _mark("BEGIN", name).search(src), _mark("END", name).search(src)
    if not m0 or not m1:
        raise SystemExit(f"模板里找不到标记 RM-BEGIN/RM-END {name} —— 标记被改过？")
    return src[m0.end():m1.start()]


def set_region(src, name, body):
    m0, m1 = _mark("BEGIN", name).search(src), _mark("END", name).search(src)
    if not m0 or not m1:
        raise SystemExit(f"页面里找不到标记 RM-BEGIN/RM-END {name} —— 标记被改过？")
    return src[:m0.end()] + body + src[m1.start():]


def inline_block(rel):
    """把 assets/js/<x>.js 逐字节包成一段 <script>（首绘要用的两段代码走这条路）"""
    path = os.path.join(ROOT, rel)
    with open(path, encoding="utf-8") as fh:
        code = fh.read()
    if "</script" in code:
        raise SystemExit(f"{rel} 里出现了 </script —— 内联会截断，先处理掉")
    return "<script>\n" + code + "</script>"


def shift_depth(src):
    """把壳里所有**相对** href/src 前缀多一层 `../`（pages/ → pages/albums/）。

    只动相对路径：`https:` / `//` / `/` / `#` / 其它 scheme 一律不碰。
    ⚠️ 必须在替换标记内容**之前**做 —— 生成器写进去的片段（书名、照片、上一册下一册）
       已经是按深度 2 写好的，再被这里加一层就全错了。 """
    def fix(m):
        attr, url = m.group(1), m.group(2)
        if not url or re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", url) or url[0] in "/#?":
            return m.group(0)
        return f'{attr}="../{url}"'
    return re.sub(r'\b(href|src)="([^"]*)"', fix, src)


REF_RE = re.compile(r'\b(?:href|src)="([^"#][^"]*)"')
SCHEME_RE = re.compile(r"^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|//)")


def check_refs(page_path, src):
    """生成物的自检：每个相对 href/src 都得能在磁盘上找到。

    这一步是**故意**放在生成器里的 —— 深度换算是这次改动里最容易错、又最不容易被
    肉眼发现的一环（多了少了一层 `../`，页面上只是图裂了/跳错页）。 """
    bad = []
    base = os.path.dirname(page_path)
    for m in REF_RE.finditer(src):
        url = m.group(1).split("?")[0].split("#")[0]
        if not url or SCHEME_RE.match(url):
            continue
        if not os.path.exists(os.path.normpath(os.path.join(base, url))):
            bad.append(url)
    return bad


# ------------------------------------------------------------- 3. 片段
def frag_hero(a):
    return (
        f'\n      <a class="album-back" href="../photos.html">← 全部相簿</a>\n'
        f'      <p class="album-eyebrow">{esc(a["region"])}</p>\n'
        f'      <h1 class="album-title">{esc(a["zh"])}</h1>\n'
        f'      <p class="about-hero-desc">{esc(a["note"])}</p>\n    '
        # ⚠️ 这里原来是第三行元信息「张数 · 英文名」（`<p class="album-hero-meta">`）。
        # 2026-09-26 第三百二十一批整条删掉 —— 主人先嫌它挤、搬到右上角看过之后，
        # 原话「还是把右上角 e.g. "15 张·2024.01.30 – 2026.07.03" 删了吧」。
        # 于是 hero 只剩五件：返回键 / 地区小标 / 巨字册名 / 拉丁名 / 一句话。
        # ⇒ **别在这里加回来**：那等于把同一页再挤一行小字，这条路走过一次被退了。
        # 张数与英文名没有丢：墙上封面角标是「N 张」，拉丁名是上面那行 title-latin；
        # `<meta name="description">` 里也有。
    )


def frag_strip(a):
    out = []
    for i, (base, w, h, cap, at) in enumerate(a["photos"]):
        label = cap or a["zh"]
        load = "eager" if i < STRIP_EAGER else "lazy"
        out.append(
            f'\n      <button class="album-shot" type="button" style="--ar:{ar_str(w, h)}"'
            f' data-view="{esc(view_url(a["slug"], base))}"'
            f' aria-label="放大：{esc(label)}　{stamp(at)}">'
            f'<img src="{esc(thumb_url(a["slug"], base))}" alt="{esc(label)}"'
            f' decoding="async" loading="{load}"></button>'
        )
    return "".join(out) + "\n    "


def frag_nav(a, idx, albums):
    total = len(albums)
    prev_a = albums[(idx - 1 + total) % total]
    next_a = albums[(idx + 1) % total]

    def side(other, kind, label, text):
        # 名字**不是链接**（2026-09-21 晚主人「上一页/下一页的名字不可以点击，名字移到
        # 上一页/下一页的上面」）—— 纯展示节点，与下面的按钮是兄弟关系。
        # 手机版把上面那行册名藏了（≤480），信息不能跟着一起没 ⇒ 按钮的可访问名带上它。
        return (
            f'\n      <div class="album-nav-side album-nav-side--{kind}">'
            f'<span class="album-nav-n">{esc(other["zh"])}</span>'
            f'<a class="album-nav-link album-nav-{kind}" href="{other["slug"]}.html"'
            f' aria-label="{label}：{esc(other["zh"])}">'
            f'<span class="album-nav-k">{text}</span></a></div>'
        )

    return (side(prev_a, "prev", "上一册", "← 上一册")
            + f'\n      <span class="album-nav-idx">{idx + 1} / {total}</span>'
            + side(next_a, "next", "下一册", "下一册 →") + "\n    ")


def frag_stats(stats):
    # 只留三格纯计数（起讫区间格 2026-09-21 撤掉）。第三格「N 个地区」**手机版不显示**
    # （2026-09-24 主人「照片页，手机版移除 5 个地区的显示」）—— 藏它的规则在 style.css
    # 的窄屏适配那段。给每格一个自己的修饰类，别让 CSS 去猜 :nth-child(3)。
    rows = [(stats["albums"], "个相簿", "albums"),
            (stats["photos"], "张照片", "photos"),
            (stats["regions"], "个地区", "regions")]
    return "".join(
        f'\n        <div class="album-stat album-stat--{k}">'
        f'<span class="album-stat-v">{v}</span><span class="album-stat-k">{t}</span></div>'
        for v, t, k in rows) + "\n      "


def frag_wall(albums):
    out = []
    for i, a in enumerate(albums):
        eager = i < WALL_EAGER
        fp = ' fetchpriority="high"' if eager else ""
        out.append(
            f'\n        <a class="album-tile" href="albums/{a["slug"]}.html">'
            f'<div class="album-tile-cover">'
            f'<img src="{esc(thumb_url(a["slug"], a["cover"]))}"'
            f' alt="{esc(a["zh"])}　{esc(a["note"])}" width="900" height="675"'
            f' loading="{"eager" if eager else "lazy"}"{fp} decoding="async">'
            f'<span class="album-tile-count">{a["count"]} 张</span>'
            f'</div><h3 class="album-tile-name">{esc(a["zh"])}</h3>'
            f'<p class="album-tile-note">{esc(a["note"])}</p></a>'
        )
    return "".join(out) + "\n      "


# ------------------------------------------------------------- 4. 页面
def build_album_pages(albums):
    with open(SHELL, encoding="utf-8") as fh:
        shell = fh.read()
    written = []
    for i, a in enumerate(albums):
        src = shift_depth(shell)
        src = set_region(src, "router", "")          # 静态页不需要老网址路由器
        src = set_region(src, "headmeta",
                         f'\n<meta name="description" content="{esc(a["zh"])}：{esc(a["note"])}　'
                         f'{a["count"]} 张照片">\n')
        src = set_region(src, "title", f'\n<title>{esc(a["zh"])} — rain.meow</title>\n')
        src = set_region(src, "hero", frag_hero(a))
        src = set_region(src, "strip", frag_strip(a))
        src = set_region(src, "nav", frag_nav(a, i, albums))
        src = set_region(src, "inline:assets/js/plate.js", inline_block("assets/js/plate.js"))
        src = set_region(src, "inline:assets/js/album-strip.js", inline_block("assets/js/album-strip.js"))
        path = os.path.join(ALBUMS_DIR, f'{a["slug"]}.html')
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(src)
        written.append(path)

    # 引用自检放在**全部写完之后**：册页之间互相链接（上一册／下一册），
    # 边写边查会把"还没写到的兄弟页"当成断链。
    bad_refs = [(p, bad) for p in written if (bad := check_refs(p, open(p, encoding="utf-8").read()))]
    return written, bad_refs


def update_wall(albums, stats):
    with open(WALL, encoding="utf-8") as fh:
        src = fh.read()
    src = set_region(src, "stats", frag_stats(stats))
    src = set_region(src, "wall", frag_wall(albums))
    src = set_region(src, "inline:assets/js/plate.js", inline_block("assets/js/plate.js"))
    with open(WALL, "w", encoding="utf-8") as fh:
        fh.write(src)
    return check_refs(WALL, src)


def prune_stale(slugs):
    """册子被删掉之后，旧页面不能留在 pages/albums/ 里当幽灵 —— 那目录整个是生成物。"""
    if not os.path.isdir(ALBUMS_DIR):
        return []
    gone = []
    for f in sorted(os.listdir(ALBUMS_DIR)):
        if f.endswith(".html") and f[:-5] not in slugs:
            os.remove(os.path.join(ALBUMS_DIR, f))
            gone.append(f)
    return gone


def main():
    only_data = "--data" in sys.argv
    man = json.load(open(os.path.join(PHOTOS, "manifest.json")))
    albums = build_albums(man)
    data = build_data(albums)

    missing = [a["slug"] for a in albums if a["slug"] not in NOTE]
    if missing:
        print(f"⚠️ 这些相簿还没有手写的一句话（NOTE）：{', '.join(missing)}")

    write_data_js(data)
    print(f"{OUT}  {os.path.getsize(OUT) / 1024:.1f} KB")
    print(f"相簿 {data['stats']['albums']} · 照片 {data['stats']['photos']} · 地区 {data['stats']['regions']}")
    if only_data:
        return

    os.makedirs(ALBUMS_DIR, exist_ok=True)
    gone = prune_stale({a["slug"] for a in albums})
    written, bad_refs = build_album_pages(albums)
    wall_bad = update_wall(albums, data["stats"])

    print(f"单册页 {len(written)} 个 → pages/albums/")
    for p in written:
        print(f"  {os.path.basename(p):24s} {os.path.getsize(p) / 1024:6.1f} KB")
    if gone:
        print(f"删掉已不存在的相簿页：{', '.join(gone)}")
    print(f"相簿墙已注入 pages/photos.html")

    probes = [(WALL, wall_bad)] + bad_refs
    for path, bad in probes:
        for u in bad:
            print(f"❌ {os.path.relpath(path, ROOT)}：相对链接指不到文件 → {u}")
    if any(b for _, b in probes):
        sys.exit(1)

    for a in albums:
        print(f"  {a['slug']:18s} {a['count']:3d}  封面 {a['cover']}  {a['note']}")


if __name__ == "__main__":
    main()
