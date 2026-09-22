#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从 assets/photos/manifest.json 产出网页要用的相簿数据（assets/js/photos-data.js）。

为什么产物是 .js 而不是 .json：站点在 GitHub Pages 上是 HTTP 没问题，
但本地用 file:// 直接打开页面时 fetch 一个本地 .json 会被 CORS 拦掉。
写成挂到 window 上的脚本就没有这个限制，本地线上同一个文件都能跑。

封面（cover）是人工挑的：先把每个相簿按「横构图优先 × 分辨率」排前 6 名做成对照图，
人眼从里面挑一张，挑选结果记在 COVER_RANK 里（数字 = 名次，从 1 数起）。
相簿描述（NOTE）同样是手写的 —— 这两样是内容，不该让脚本猜。

用法：
    python3 tools/photos-data.py
"""
import json
import os
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHOTOS = os.path.join(ROOT, "assets", "photos")
OUT = os.path.join(ROOT, "assets", "js", "photos-data.js")

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


def main():
    man = json.load(open(os.path.join(PHOTOS, "manifest.json")))
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

    regions = []
    for al in albums:
        if al["region"] not in regions:
            regions.append(al["region"])

    data = {
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

    body = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write("/* 相簿数据：由 tools/photos-data.py 生成，手改会在下次生成时被覆盖。\n"
                 "   为什么是 .js 不是 .json：本地用 file:// 打开页面时 fetch 本地 json 会被 CORS 拦，\n"
                 "   挂到 window 上就没这问题。 */\n")
        fh.write("window.RM_PHOTOS = ")
        fh.write(body)
        fh.write(";\n")

    print(f"{OUT}  {os.path.getsize(OUT)/1024:.1f} KB")
    print(f"相簿 {data['stats']['albums']} · 照片 {data['stats']['photos']} · 地区 {data['stats']['regions']}")
    for a in albums:
        print(f"  {a['slug']:18s} {a['count']:3d}  封面 {a['cover']}  {a['note']}")


if __name__ == "__main__":
    main()
