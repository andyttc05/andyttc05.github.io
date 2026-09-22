/* 动态页内容源（原 posts.json）。
   用 <script src> 加载而不是 fetch：http 与 file:// 双击打开都能读，
   不需要起本地服务器。内容格式与原来完全一致，直接编辑下面的数组即可。
   改完不用手动改版本号：跑 node tools/stamp.mjs --write，键会按文件内容重算。
   排版顺序由 date 决定 —— 渲染时按日期倒序排，数组里怎么写都行（这里按时间新→旧）。
   alt 一律按**实际识别到的内容**写（本地 Vision：VNClassifyImageRequest + OCR），
   不写没把握的地名 —— 假信息比模糊更糟。

   图片不放仓库，全部在 Cloudflare R2（桶 andyttc05）的 images/photos/posts/ 下
   —— 与相簿共用同一个 photos 树（2026-09-23 从 images/posts/ 搬过来）。
   本地副本在 assets/photos/posts/，和相簿目录同级；那片已被 .gitignore 挡掉，
   所以仓库里一张图都没有（相簿亦然）。
   · 换图流程：cwebp -q 80 -m 6 -mt -sharp_yuv -preset photo -metadata none 转好，
     放进 assets/photos/posts/ 并推到 r2:andyttc05/images/photos/posts/，
     **然后把那条 src 的 ?v= 加一** —— 对象带
     immutable 一年缓存，不升版本号老访客看不到新图。
     （大批量的话直接 bash tools/photos-sync.sh，它按 assets/photos/ 整棵树对齐。）
   · 换域名（比如接自定义域）就整表替换 src 前缀，一条 sed 的事。 */
window.__DY_POSTS = {
  "posts": [
    {
      "id": "20260831-hkust-day1",
      "date": "2026-08-31T22:01",
      "text": "My first day at HKUST~ (≧∇≦)",
      "photos": [
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-08-31-01-street-and-cars.webp?v=1",       "alt": "云下的马路与车" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-08-31-02-seng-lobby.webp?v=1",            "alt": "工学院（SENG）入口" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-08-31-03-walking-on-campus.webp?v=1",     "alt": "走在校园里的人" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-08-31-04-room-interior.webp?v=1",         "alt": "室内一角" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-08-31-05-water-and-hills.webp?v=1",       "alt": "窗外的水面与山丘" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-08-31-06-building-at-night.webp?v=1",     "alt": "夜里的楼与树" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-08-31-07-hkust-sign.webp?v=1",            "alt": "HKUST 立体字与横幅" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-08-31-08-dome-at-night.webp?v=1",         "alt": "夜里的穹顶建筑" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-08-31-09-lamplit-path-at-night.webp?v=1", "alt": "夜里亮着灯的小路" }
      ]
    },
    {
      "id": "20260829-nanchang",
      "date": "2026-08-29T21:22",
      "text": "开学前去了一趟南昌，bro 开着小车带我四处逛。好玩的地方基本都转了一遍，玩得挺开心～就是台风把摩天轮吹没了，没坐上。香港见～",
      "photos": [
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-08-29-01-nanchang-dialect-wall.webp?v=1", "alt": "墙上的南昌方言词" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-08-29-02-hills-and-lake.webp?v=1",        "alt": "山与湖" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-08-29-03-ferris-wheel-park.webp?v=1",     "alt": "乐园里的摩天轮" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-08-29-04-city-and-signs.webp?v=1",        "alt": "城区街景与招牌" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-08-29-05-night-street.webp?v=1",          "alt": "夜里的街景" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-08-29-06-street-art-and-metro.webp?v=1",  "alt": "街头墙绘与地铁标识" }
      ]
    },
    {
      "id": "20260816-suzhou",
      "date": "2026-08-16T23:16",
      "text": "今天从无锡出发去苏州玩了w\n逛了留园，人真多，不过穿古装的也特别多，到处都是拍写真的，特别热闹。山塘街人也少不了多少，那边景点和居民区混在一起，走两步就是小桥流水，感觉挺自在。后来实在走不动了，躲到万象城去了，吹着空调逛小店，确实比在外面晒着舒服。\n晚上回来腿都酸了，不过跑了这么多地方，还是挺好玩的～o(≧v≦)o",
      "photos": [
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-08-16-01-cat-in-garden.webp?v=1",    "alt": "院子里的猫与绿植" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-08-16-02-street-and-dog.webp?v=1",   "alt": "街角的小狗与横幅" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-08-16-03-street-and-shops.webp?v=1", "alt": "街边的店铺与人" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-08-16-04-suzhou-station.webp?v=1",   "alt": "苏州站与 ASCOTT 大楼" }
      ]
    },
    {
      "id": "20260726-bbq",
      "date": "2026-07-26T01:55",
      "text": "这个烤肉还挺好吃的\n(^_−)−☆",
      "photos": [
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-07-26-01-bbq-platter.webp?v=1", "alt": "盘里的肉与配菜" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-07-26-02-bbq-grill.webp?v=1",   "alt": "盘里的肉与香肠" }
      ]
    },
    {
      "id": "20260725-cat",
      "date": "2026-07-25T10:47",
      "text": "是一只好可爱的小猫咪呀～(´▽｀)",
      "photos": [
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-07-25-01-cat-on-wood.webp?v=1", "alt": "木栏上的猫" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-07-25-02-cat-resting.webp?v=1", "alt": "趴着的猫" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-07-25-03-cat-closeup.webp?v=1", "alt": "猫的特写" }
      ]
    },
    {
      "id": "20260718-birthday",
      "date": "2026-07-18T22:16",
      "text": "和 bro 一起过生日\n今年的生日没有遗憾了\n(´▽｀)",
      "photos": [
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-07-18-01-birthday-cake.webp?v=1", "alt": "写着 love you 的生日蛋糕" }
      ]
    },
    {
      "id": "20260716-gift",
      "date": "2026-07-16T23:40",
      "text": "今天收到的小礼物，挺棒的～\no(*////▽////*)q",
      "photos": [
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-07-16-01-gift-flatlay.webp?v=1", "alt": "摊在桌上的小礼物：T 恤与水壶" }
      ]
    },
    {
      "id": "20260711-citywalk",
      "date": "2026-07-11T11:34",
      "text": "Spent the whole day on a group city walk! Super crowded, and so many foreigners around. SH really is a proper metropolis. The harbor view is gorgeous~ o(≧v≦)o\nPS: Yesterday was such a tiring day 囧",
      "photos": [
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-07-11-01-skyline-and-lawn.webp?v=1",     "alt": "城市天际线与草坪" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-07-11-02-old-street-shopfront.webp?v=1", "alt": "老街上的店招" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-07-11-03-clock-tower.webp?v=1",          "alt": "江边的钟楼" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-07-11-04-statue-at-facade.webp?v=1",     "alt": "建筑壁龛里的雕像" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-07-11-05-street-with-trees.webp?v=1",    "alt": "树荫下的街口" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-07-11-06-heritage-facade.webp?v=1",      "alt": "带旗子的老建筑立面" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-07-11-07-river-cityscape.webp?v=1",      "alt": "江对岸的城市轮廓" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-07-11-08-skyline-at-sunset.webp?v=1",    "alt": "夕阳下的高楼群" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-07-11-09-skyline-upward.webp?v=1",       "alt": "仰视高楼" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-07-11-10-river-night.webp?v=1",          "alt": "夜里的江面与楼群" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-07-11-11-riverside-crowd.webp?v=1",      "alt": "江边的人潮" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-07-11-12-street-at-night.webp?v=1",      "alt": "夜里的街口与车流" }
      ]
    },
    {
      "id": "20260709-shanghai-first",
      "date": "2026-07-09T20:41",
      "text": "My first time in Shanghai",
      "photos": [
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-07-09-01-shanghai-map.webp?v=1", "alt": "手机上的上海地图截图" }
      ]
    },
    {
      "id": "20260522-shenzhen",
      "date": "2026-05-22T22:29",
      "text": "Pretty obsessed with the lifestyle and cuisine in Shenzhen. I’ve been enjoying life these past few days~\n(≧∇≦)",
      "photos": [
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-05-22-01-universiade-station.webp?v=1",   "alt": "地铁线路图上的大运 Universiade 站" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-05-22-02-room-and-screen.webp?v=1",       "alt": "房间里的电脑与屏幕" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-05-22-03-food-plate.webp?v=1",            "alt": "一盘菜" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-05-22-04-cup-and-rice.webp?v=1",          "alt": "一杯饮料和一碗饭" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-05-22-05-bowl-and-glass.webp?v=1",        "alt": "一碗饭和一杯饮品" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-05-22-06-street-and-billboards.webp?v=1", "alt": "街景与路边广告牌" }
      ]
    },
    {
      "id": "20260223-gold-medal",
      "date": "2026-02-23T11:21",
      "text": "拿下铠的的金标，我的第二个万战英雄\no(≧v≦)o",
      "photos": [
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-02-23-01-hero-title-screen.webp?v=1", "alt": "「恭喜您获得本周荣耀称号」的结算页" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-02-23-02-gold-medal-rank.webp?v=1",   "alt": "金标结算：星级 +2、距离市榜前 100" }
      ]
    },
    {
      "id": "20260215-trip",
      "date": "2026-02-16T00:49",
      "text": "又一趟旅行结束。\n这次跟以前不太一样。\n以前总想着把行程跑完，这次没怎么按计划来。\n反而是一些顺路碰上的小事记得最清楚。\n有次随便搭了辆车，路边买了支雪糕，还突然跑去吃了顿海底捞。\n现在还能想起来的，就这几样。\n谢谢你陪我走这一趟，再见啦，挚友～",
      "photos": [
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-02-15-01-luckin-street.webp?v=1",   "alt": "瑞幸街口" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-02-15-02-sleeping-cat.webp?v=1",    "alt": "木台上酣睡的猫" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-02-15-03-ice-cream.webp?v=1",       "alt": "一支雪糕" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-02-15-04-bear-statue.webp?v=1",     "alt": "水边的雕像" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-02-15-05-lantern-street.webp?v=1",  "alt": "人挤人的老街" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-02-15-06-chagee.webp?v=1",          "alt": "霸王茶姬的袋子" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-02-15-07-two-fluffy-cats.webp?v=1", "alt": "两只长毛猫" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-02-15-08-bookshelf-cat.webp?v=1",   "alt": "书架边的猫" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-02-15-09-game-event.webp?v=1",      "alt": "情人节游戏活动页" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-02-15-10-boonie-snacks.webp?v=1",   "alt": "熊出没的零食" },
        { "src": "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/photos/posts/2026-02-15-11-seaside-town.webp?v=1",    "alt": "海边的蓝色屋顶小镇" }
      ]
    }
  ]
};
