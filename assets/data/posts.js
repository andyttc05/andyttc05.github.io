/* 动态页内容源（原 posts.json）。
   用 <script src> 加载而不是 fetch：http 与 file:// 双击打开都能读，
   不需要起本地服务器。内容格式与原来完全一致，直接编辑下面的数组即可。
   改完不用手动改版本号：跑 node tools/stamp.mjs --write，键会按文件内容重算。
   排版顺序由 date 决定 —— 渲染时按日期倒序排，数组里怎么写都行（这里按时间新→旧）。
   alt 一律按**实际识别到的内容**写（本地 Vision：VNClassifyImageRequest + OCR），
   不写没把握的地名 —— 假信息比模糊更糟。 */
window.__DY_POSTS = {
  "posts": [
    {
      "id": "20260831-hkust-day1",
      "date": "2026-08-31T22:01",
      "text": "My first day at HKUST~ (≧∇≦)",
      "photos": [
        { "src": "../assets/images/posts/2026-08-31-01-street-and-cars.jpg",       "alt": "云下的马路与车" },
        { "src": "../assets/images/posts/2026-08-31-02-seng-lobby.jpg",            "alt": "工学院（SENG）入口" },
        { "src": "../assets/images/posts/2026-08-31-03-walking-on-campus.jpg",     "alt": "走在校园里的人" },
        { "src": "../assets/images/posts/2026-08-31-04-room-interior.jpg",         "alt": "室内一角" },
        { "src": "../assets/images/posts/2026-08-31-05-water-and-hills.jpg",       "alt": "窗外的水面与山丘" },
        { "src": "../assets/images/posts/2026-08-31-06-building-at-night.jpg",     "alt": "夜里的楼与树" },
        { "src": "../assets/images/posts/2026-08-31-07-hkust-sign.jpg",            "alt": "HKUST 立体字与横幅" },
        { "src": "../assets/images/posts/2026-08-31-08-dome-at-night.jpg",         "alt": "夜里的穹顶建筑" },
        { "src": "../assets/images/posts/2026-08-31-09-lamplit-path-at-night.jpg", "alt": "夜里亮着灯的小路" }
      ]
    },
    {
      "id": "20260829-nanchang",
      "date": "2026-08-29T21:22",
      "text": "開學前去了一趟南昌旅遊，bro開著小車帶我四處逛。好玩的地方基本都轉了一遍，玩得挺開心的～可惜因為颱風，沒坐上摩天輪，不過這趟旅行還是充滿回憶。到時候香港見～",
      "photos": [
        { "src": "../assets/images/posts/2026-08-29-01-nanchang-dialect-wall.jpg", "alt": "墙上的南昌方言词" },
        { "src": "../assets/images/posts/2026-08-29-02-hills-and-lake.jpg",        "alt": "山与湖" },
        { "src": "../assets/images/posts/2026-08-29-03-ferris-wheel-park.jpg",     "alt": "乐园里的摩天轮" },
        { "src": "../assets/images/posts/2026-08-29-04-city-and-signs.jpg",        "alt": "城区街景与招牌" },
        { "src": "../assets/images/posts/2026-08-29-05-night-street.jpg",          "alt": "夜里的街景" },
        { "src": "../assets/images/posts/2026-08-29-06-street-art-and-metro.jpg",  "alt": "街头墙绘与地铁标识" }
      ]
    },
    {
      "id": "20260816-suzhou",
      "date": "2026-08-16T23:16",
      "text": "今天從無錫出發去蘇州玩了w\n逛了留園，人真多，不過穿古裝的也特別多，到處都是拍寫真的，特別熱鬧。山塘街人也少不了多少，那邊景點和居民區混在一起，走兩步就是小橋流水，感覺挺自在。後來實在走不動了，躲到萬象城去了，吹著空調逛小店，確實比在外面曬著舒服。\n晚上回來腿都酸了，不過跑了這麼多地方，還是挺好玩的～o(≧v≦)o",
      "photos": [
        { "src": "../assets/images/posts/2026-08-16-01-cat-in-garden.jpg",   "alt": "院子里的猫与绿植" },
        { "src": "../assets/images/posts/2026-08-16-02-street-and-dog.jpg",  "alt": "街角的小狗与横幅" },
        { "src": "../assets/images/posts/2026-08-16-03-street-and-shops.jpg", "alt": "街边的店铺与人" },
        { "src": "../assets/images/posts/2026-08-16-04-suzhou-station.jpg",  "alt": "苏州站与 ASCOTT 大楼" }
      ]
    },
    {
      "id": "20260726-bbq",
      "date": "2026-07-26T01:55",
      "text": "這個烤肉還挺好吃的\n(^_−)−☆",
      "photos": [
        { "src": "../assets/images/posts/2026-07-26-01-bbq-platter.jpg", "alt": "盘里的肉与配菜" },
        { "src": "../assets/images/posts/2026-07-26-02-bbq-grill.jpg",   "alt": "盘里的肉与香肠" }
      ]
    },
    {
      "id": "20260725-cat",
      "date": "2026-07-25T10:47",
      "text": "是一隻好可愛的小貓咪呀～(´▽｀)",
      "photos": [
        { "src": "../assets/images/posts/2026-07-25-01-cat-on-wood.jpg", "alt": "木栏上的猫" },
        { "src": "../assets/images/posts/2026-07-25-02-cat-resting.jpg", "alt": "趴着的猫" },
        { "src": "../assets/images/posts/2026-07-25-03-cat-closeup.jpg", "alt": "猫的特写" }
      ]
    },
    {
      "id": "20260718-birthday",
      "date": "2026-07-18T22:16",
      "text": "和 bro 一起過生日\n今年的生日沒有遺憾了\n(´▽｀)",
      "photos": [
        { "src": "../assets/images/posts/2026-07-18-01-birthday-cake.jpg", "alt": "写着 love you 的生日蛋糕" }
      ]
    },
    {
      "id": "20260716-gift",
      "date": "2026-07-16T23:40",
      "text": "今天收到的小禮物，挺棒的～\no(*////▽////*)q",
      "photos": [
        { "src": "../assets/images/posts/2026-07-16-01-gift-flatlay.jpg", "alt": "摊在桌上的小礼物：T 恤与水壶" }
      ]
    },
    {
      "id": "20260711-citywalk",
      "date": "2026-07-11T11:34",
      "text": "Spent the whole day on a group city walk! It was so crowded, and there were so many foreigners on the streets. I can really feel that SH is an awesome metropolis. It is so beautiful~ I absolutely love the harbor view here o(≧v≦)o\nPS: Yesterday was such a tiring day 囧",
      "photos": [
        { "src": "../assets/images/posts/2026-07-11-01-skyline-and-lawn.jpg",     "alt": "城市天际线与草坪" },
        { "src": "../assets/images/posts/2026-07-11-02-old-street-shopfront.jpg", "alt": "老街上的店招" },
        { "src": "../assets/images/posts/2026-07-11-03-clock-tower.jpg",          "alt": "江边的钟楼" },
        { "src": "../assets/images/posts/2026-07-11-04-statue-at-facade.jpg",     "alt": "建筑壁龛里的雕像" },
        { "src": "../assets/images/posts/2026-07-11-05-street-with-trees.jpg",    "alt": "树荫下的街口" },
        { "src": "../assets/images/posts/2026-07-11-06-heritage-facade.jpg",      "alt": "带旗子的老建筑立面" },
        { "src": "../assets/images/posts/2026-07-11-07-river-cityscape.jpg",      "alt": "江对岸的城市轮廓" },
        { "src": "../assets/images/posts/2026-07-11-08-skyline-at-sunset.jpg",    "alt": "夕阳下的高楼群" },
        { "src": "../assets/images/posts/2026-07-11-09-skyline-upward.jpg",       "alt": "仰视高楼" },
        { "src": "../assets/images/posts/2026-07-11-10-river-night.jpg",          "alt": "夜里的江面与楼群" },
        { "src": "../assets/images/posts/2026-07-11-11-riverside-crowd.jpg",      "alt": "江边的人潮" },
        { "src": "../assets/images/posts/2026-07-11-12-street-at-night.jpg",      "alt": "夜里的街口与车流" }
      ]
    },
    {
      "id": "20260709-shanghai-first",
      "date": "2026-07-09T20:41",
      "text": "My first time in Shanghai",
      "photos": [
        { "src": "../assets/images/posts/2026-07-09-01-shanghai-map.jpg", "alt": "手机上的上海地图截图" }
      ]
    },
    {
      "id": "20260522-shenzhen",
      "date": "2026-05-22T22:29",
      "text": "Pretty obsessed with the lifestyle and cuisine in Shenzhen. I’ve been enjoying life these past few days~\n(≧∇≦)",
      "photos": [
        { "src": "../assets/images/posts/2026-05-22-01-universiade-station.jpg",   "alt": "地铁线路图上的大运 Universiade 站" },
        { "src": "../assets/images/posts/2026-05-22-02-room-and-screen.jpg",       "alt": "房间里的电脑与屏幕" },
        { "src": "../assets/images/posts/2026-05-22-03-food-plate.jpg",            "alt": "一盘菜" },
        { "src": "../assets/images/posts/2026-05-22-04-cup-and-rice.jpg",          "alt": "一杯饮料和一碗饭" },
        { "src": "../assets/images/posts/2026-05-22-05-bowl-and-glass.jpg",        "alt": "一碗饭和一杯饮品" },
        { "src": "../assets/images/posts/2026-05-22-06-street-and-billboards.jpg", "alt": "街景与路边广告牌" }
      ]
    },
    {
      "id": "20260223-gold-medal",
      "date": "2026-02-23T11:21",
      "text": "拿下鎧的的金標，我的第二個萬戰英雄\no(≧v≦)o",
      "photos": [
        { "src": "../assets/images/posts/2026-02-23-01-hero-title-screen.jpg", "alt": "「恭喜您获得本周荣耀称号」的结算页" },
        { "src": "../assets/images/posts/2026-02-23-02-gold-medal-rank.jpg",   "alt": "金标结算：星级 +2、距离市榜前 100" }
      ]
    },
    {
      "id": "20260215-trip",
      "date": "2026-02-16T00:49",
      "text": "又一趟旅程画上了句号。\n这一次，和以往略有不同。\n我发现旅行的意义，并不在于按部就班地完成既定行程。\n有时那些顺其自然的点滴，反而是更美好的回忆。\n比如一次偶然的代步工具，一支惊喜的雪糕，一顿突如其来的海底捞。\n这些碎片，才是青春里最珍贵的印记。\n感谢你的陪伴，再见了，挚友～",
      "photos": [
        { "src": "../assets/images/posts/2026-02-15-01-luckin-street.jpg",   "alt": "瑞幸街口" },
        { "src": "../assets/images/posts/2026-02-15-02-sleeping-cat.jpg",    "alt": "木台上酣睡的猫" },
        { "src": "../assets/images/posts/2026-02-15-03-ice-cream.jpg",       "alt": "一支雪糕" },
        { "src": "../assets/images/posts/2026-02-15-04-bear-statue.jpg",     "alt": "水边的雕像" },
        { "src": "../assets/images/posts/2026-02-15-05-lantern-street.jpg",  "alt": "人挤人的老街" },
        { "src": "../assets/images/posts/2026-02-15-06-chagee.jpg",          "alt": "霸王茶姬的袋子" },
        { "src": "../assets/images/posts/2026-02-15-07-two-fluffy-cats.jpg", "alt": "两只长毛猫" },
        { "src": "../assets/images/posts/2026-02-15-08-bookshelf-cat.jpg",   "alt": "书架边的猫" },
        { "src": "../assets/images/posts/2026-02-15-09-game-event.jpg",      "alt": "情人节游戏活动页" },
        { "src": "../assets/images/posts/2026-02-15-10-boonie-snacks.jpg",   "alt": "熊出没的零食" },
        { "src": "../assets/images/posts/2026-02-15-11-seaside-town.jpg",    "alt": "海边的蓝色屋顶小镇" }
      ]
    }
  ]
};
