/* ===========================================================================
   相簿增强层（2026-09-25 起：内容与几何都不在这里了）

   2026-09-25 方案 B 静态化之后，相簿两页的分工彻底变了 ——
     · photos.html（墙）          19 张封面磁贴 = **静态 HTML**（生成器写）
                                  （原来还有一条「顶部数据条」，2026-09-27 主人要求删除）
     · album.html                 只剩「老网址路由器」；19 个单册页在 pages/albums/
     · pages/albums/<slug>.html   书名 / 元信息 / 每一张照片 / 上一册下一册 = **静态 HTML**
     · 图片「底板 → 照片」的交接  = **内联的 plate.js**（解析期）
     · 照片墙「对齐行」的几何     = **内联的 album-strip.js**（解析期）
   为什么内容与几何必须离开本文件：本文件是 defer，跑在 DCL（实测 258~414ms），
   而跨文档过渡的新页快照拍在 pagereveal（52~270ms）⇒ 快照里是一张空壳，整页被洗白。
   详见 pages/album.html 顶部、assets/js/album-strip.js 顶部，与
   ~/.workbuddy/scratch/photo-flash-2026-09-25/report-photo-flash.html。

   于是本文件现在只剩四件**必须在文档之后做**的事：
     · 墙的位置记忆（离开墙 / 点「← 全部相簿」回到原位）—— 见一号段
     · 墙封面那叠照片的**按需取图**（2026-09-27 第三百三十四批）—— 见三号段
     · 单册页的灯箱接线与 resize 重排
     · 顺手兜住"内联引擎没跑起来"（例如元素当时宽度为 0）时的补排

   返回位置（2026-09-21 晚，主人「点击相册，再点击返回全部相簿，放回到上次相册滑动的
   地方比较好」）：墙上点进一册、再点单册页的「← 全部相簿」，墙要回到离开时那一段。
   两个 sessionStorage 键（rm-album-wall / rm-album-back）与 why 见一号段。
   =========================================================================== */
(function () {
  'use strict';

  var wall = document.getElementById('albumWall');
  var strip = document.getElementById('albumStrip');
  if (!wall && !strip) return;

  /* =========================================================================
     一、离开 / 回到相簿墙：把位置放回原位
     （2026-09-21 晚 主人「点击相册，再点击返回全部相簿，放回到上次相册滑动的地方比较好」）

     病根：从墙上点进某一册、再点单册页的「← 全部相簿」，那是一次**新导航**
     （<a href="../photos.html">）。浏览器只在前进/后退时才还原滚动位置，新导航一律从墙顶
     开始 —— 而人想接着看的，正是他刚点过那一格附近。

     两个键、一进一出，都只住在本文件、都只走 sessionStorage（一个标签页一份）：
       · `rm-album-wall`  墙上点某一格（＝离开墙）那一刻的滚动位置。
         记录时机选**点击**而不是滚动：语义才是「我走的时候墙停在哪」，也省掉一个常驻的
         scroll 监听。（同族的另一个活儿是刷新兜底，那个记录键住在 script.js 里，不归这儿。）
       · `rm-album-back`  单册页点「← 全部相簿」时写下的一次性标志。墙**看到它才动**，
         用完即清（所以它同时兼着"别在刷新时再跳一次"）。

     ⚠️ 为什么不写成"每次进墙都还原"：从导航栏「照片」进来是**新的一次访问**，必须落回
        墙顶。只有"点返回来的"那一次才该回原位。
     ⚠️ 前进/后退不归这里管：那是原生历史还原的活儿（两个引擎都正常），
        script.js 的刷新兜底也只在 reload 生效 —— 三方井水不犯河水。
     ⚠️ 键名刻意自成一族 `rm-album-*`：刷新策略那几个键（见 script.js）只许住在 script.js，
        tools/stamp.mjs 的 ONE-PLACE **是纯字符串扫描**的 —— 连在注释里提一嘴都会判红，
        所以下面那段说明里连它们的名字都不写。
     ⚠️ 还原必须在**这一次脚本同步执行时**做完（defer 跑完即滚，早于任何 rAF / load）：
        站里开着跨文档 View Transition，新页快照是 pagereveal 那一刻拍的（style.css 那段
        注释）。晚一步再滚，快照里是墙顶，450ms 过渡一结束画面凭空跳一下；此刻滚，
        快照本身就在原位 —— 落点是"从头就在那儿"，不是"淡进来之后再滑过去"。
        ⚠️ 墙静态化之后这条更容易满足了（文档高度在解析期就是最终值），但脚本仍是 defer
           ⇒ **冷缓存**那一次依旧晚于快照；从单册页点回来的那一次必然命中缓存，
           所以要修的正是它，能赶上。 */
  var WALL_Y_KEY = 'rm-album-wall';
  var WALL_BACK_KEY = 'rm-album-back';

  /* sessionStorage 一律包一层：隐私模式/配额异常时抛错，页面照旧能用（渐进增强） */
  function store(fn) {
    try { return fn(); } catch (e) { return null; }
  }

  /* 离开墙：记下这一刻的滚动位置 */
  function rememberWallSpot(wallEl) {
    wallEl.addEventListener('click', function (e) {
      var t = e.target;
      var tile = t && t.closest ? t.closest('.album-tile') : null;
      if (!tile) return;
      /* 中键 / ⌘-点击 = 新标签页打开，墙还在这儿没走 —— 那不算"离开"，别记，
         否则那个新标签页里再点返回会莫名其妙地跳。 */
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      store(function () { sessionStorage.setItem(WALL_Y_KEY, String(Math.round(window.scrollY || 0))); });
    });
  }

  /* 回到墙：只在那一次性标志还在时动，且只动这一次 */
  function restoreWallSpot() {
    var back = store(function () {
      var b = sessionStorage.getItem(WALL_BACK_KEY) === '1';
      if (b) sessionStorage.removeItem(WALL_BACK_KEY);   /* 一次性：用完即清，别在刷新时再跳 */
      return b;
    });
    if (!back) return;

    /* 🔴 这一跳**不播开场动画**（2026-09-22 主人「点击相册，然后放回所有相册页，
       不触发页面开场动画」）。打一个类：
         · CSS（style.css 末尾那条）用它关掉标题的逐字弹出；
         · 判据是"点了那个返回链接"，不是"有位置可放回" —— 所以这一行必须写在下面
           那几个 early-return **之前**：从墙顶（want = 0）点进某一册再回来时没什么
           位置可"放回"，但"不播开场"照样要生效。 */
    document.documentElement.classList.add('album-back-instant');

    var want = parseInt(store(function () { return sessionStorage.getItem(WALL_Y_KEY); }) || '', 10);
    if (!isFinite(want) || want <= 0) return;            /* 0 = 本来就在墙顶，没什么可放回的 */

    var maxY = function () { return Math.max(0, document.documentElement.scrollHeight - window.innerHeight); };
    if (maxY() <= 0) return;                             /* 文档还没铺开：别把位置钉死在 0 */
    window.scrollTo(0, Math.min(want, maxY()));

    /* 兜底一次（load 时）：图片按真实比例铺完之后末行会再往下挪一点，刚才够不到的位置
       这时就够得到。⚠️ 用户一旦自己动了滚轮/按键就立刻让位 —— 为了几像素把人家的滚动
       抢回去，比不修更烦。 */
    var taken = false;
    ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (ev) {
      window.addEventListener(ev, function () { taken = true; }, { once: true, passive: true });
    });
    window.addEventListener('load', function () {
      if (taken) return;
      var target = Math.min(want, maxY());
      if (Math.abs((window.scrollY || 0) - target) <= 2) return;
      window.scrollTo(0, target);
    }, { once: true });
  }

  /* =========================================================================
     二、单册页：灯箱 + 重排
     ========================================================================= */
  /* 照片墙的「对齐行」几何在 assets/js/album-strip.js（内联在页面里，解析期跑）。
     这里只负责：容器尺寸变了重排一次、把点图交给全站唯一的灯箱引擎。
     ⚠️ 灯箱清单**从 DOM 读**，不再是 photos-data.js 里的 RM_PHOTOS：
        data-view 是原图（view 档 1440 —— 墙上那张是 480 缩图，放大要看真的），
        img 的 src 就是缩图（灯箱底部预览带用**同一个 URL**，已经加载过 ⇒ 直接命中缓存）。
        两者都由生成器从同一对 URL 函数写出，不会各说各话。
     ⚠️ 灯箱版面的规矩（不传 cap/meta ⇒ 说明行不存在 ⇒ 与动态页逐像素相同）见
        pages/album.html 里灯箱那段的注释，本文件不碰 .dy-lb-* 的任何状态。 */
  function wireDetail(stripEl) {
    /* 内联引擎若因为元素当时宽度为 0 而跳过（隐藏、还没布局），这里补一次。
       正常情况下已经排好了 —— 重排会把图片节点搬来搬去，不做无谓的那一下。 */
    if (window.RMAlbumStrip && !stripEl.querySelector('.album-strip-row')) {
      window.RMAlbumStrip.paint(stripEl);
    }

    var rt = 0;
    window.addEventListener('resize', function () {
      if (!window.RMAlbumStrip) return;
      clearTimeout(rt);
      rt = setTimeout(function () { window.RMAlbumStrip.paint(stripEl); }, 140);
    }, { passive: true });

    var shots = [].slice.call(stripEl.querySelectorAll('.album-shot'));
    if (!shots.length) return;
    var list = shots.map(function (b) {
      var im = b.querySelector('img');
      return {
        src: b.getAttribute('data-view') || '',
        alt: (im && im.getAttribute('alt')) || b.getAttribute('aria-label') || '',
        thumb: (im && im.getAttribute('src')) || ''
      };
    });

    stripEl.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('.album-shot') : null;
      if (!b || !window.RMLightbox) return;
      var i = shots.indexOf(b);
      if (i < 0) return;
      window.RMLightbox.open(list, i);
    });
  }

  /* 页顶「← 全部相簿」（现在是静态 <a>，只差一个点击记号）。
     它同时是「这一次是点返回来的」那个信号源 —— 墙看到标志才会把位置放回去（一号段）。
     新标签页打开时不写，见 rememberWallSpot 那条。 */
  function wireBackLink() {
    var a = document.querySelector('.album-back');
    if (!a) return;
    a.addEventListener('click', function (e) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      store(function () { sessionStorage.setItem(WALL_BACK_KEY, '1'); });
    });
  }

  /* =========================================================================
     三、墙上的「照片堆叠」：背后那两张按需取图（2026-09-27 第三百三十四批）

     一层封面是一叠三张（.album-card[data-depth]，结构见 style.css 那段）。
     **几何全是静态的**：角度/手抖由生成器写在 HTML 行内、悬停动作整条写在 CSS 里，
     本文件（defer，跑在 DCL 258~414ms）一个字节都不碰它。
     🔴 为什么这么严：跨文档过渡的新页快照拍在 pagereveal（52~270ms）—— 几何若等这里写，
        快照里就是"三张叠平"、过渡结束后再"唰"地散开，正是主人骂过的
        「内容先奇怪地动一下」。

     ⇒ 本段只剩一件事：背后那两张挂在 data-src 上，**格子快到视口时才取**。
        19 格 × 2 张 900px 缩图 = 3.2MB，随页取等于把墙面从 1.5MB 抬到 4.7MB。

     🗑️ 2026-09-27 第三百三十五批主人「鼠标没悬浮在相簿时相簿背后的两张照片为什么是
        白色的」——那一版是"指针进格才取"（悬停前只露一条底板色的边，所以看着是白的）。
        现在改成观察器：**格子离视口 120px 就取**，滚到哪儿照片就跟到哪儿，静止也是照片；
        代价按滚动距离摊（实测：首屏那两行 6 格 = +1.2MB，整面墙 38 张走完才 +3.2MB）——
        封面自己本来就是 `loading="lazy"`，这一条和它同一套逻辑。
        （想把这 3.2MB 压到 ~0.8MB 得派生一档 480px 缩图，但那要先修 rclone 的 R2 凭据。）
     ⚠️ 观察的是**卡本身**（.album-card），不是舞台：手机上那两张是 `display: none`
        （没有盒子 ⇒ 观察器永远不触发）⇒ **手机一个字节都不多取**。
     ⚠️ 取之前必须摘掉 plate.js 在解析期挂的 .is-loaded（见 warmStack）。
     ⚠️ 已知取舍：宽屏触摸设备（iPad）没有 hover，但它**看得见**那两条边 ⇒
        观察器照样会取图，与电脑一致。 */
  var STACK_SEL = '.album-tile-cover[data-stack]';
  var WARM_MARGIN = '120px';        /* 提前多少开始取（首屏代价与"滚起来会不会露白"的平衡） */

  function eachStack(fn) {
    var list = document.querySelectorAll(STACK_SEL);
    for (var i = 0; i < list.length; i++) fn(list[i]);
  }

  /* 背后那两张：挂在 data-src 上，第一次真的要看时才取。
     ⚠️ 取之前必须摘掉 plate.js 在解析期挂的 .is-loaded —— 两个类同时在
        （.is-loaded 写在 .is-pending 之后）会让图硬弹出来，那 0.4s 淡入就没了。 */
  function warmStack(root) {
    var lazy = root.querySelectorAll('img[data-src]');
    for (var i = 0; i < lazy.length; i++) {
      var im = lazy[i], src = im.getAttribute('data-src');
      im.removeAttribute('data-src');
      im.classList.remove('is-loaded');
      im.setAttribute('src', src);
      if (window.RMPlate) window.RMPlate.fadeIn(im);
    }
  }

  var stackIO = null;
  function wireStack(stage) {
    var lazy = stage.querySelectorAll('img[data-src]');
    if (!lazy.length) return;
    /* 没有观察器（老引擎）就退回"一上来全取"，宁可贵一点也别让那两张永远是白的 */
    if (!window.IntersectionObserver) { warmStack(stage); return; }
    if (!stackIO) {
      stackIO = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (!entries[i].isIntersecting) continue;
          warmStack(entries[i].target.parentNode);   /* target 是 img，父节点是那张卡 */
          stackIO.unobserve(entries[i].target);
        }
      }, { rootMargin: WARM_MARGIN + ' 0px' });
    }
    for (var j = 0; j < lazy.length; j++) stackIO.observe(lazy[j]);
  }

  /* 墙这边**没有** resize 监听：版面由 CSS 的 auto-fill 自己响应视口。
     单册页那条在 wireDetail 里，管的是对齐行重排，别跟它搞混。 */
  if (wall) {
    rememberWallSpot(wall);
    restoreWallSpot();
    eachStack(wireStack);
  } else {
    wireDetail(strip);
    wireBackLink();
  }
})();
