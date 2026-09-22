/* ===========================================================================
   相簿渲染层（2026-09-21）

   一份脚本管两页，靠 <body> 上的 data-album-page 分支：
     · photos.html  data-album-page="wall"   → 数据条 + 19 张封面磁贴
     · album.html   data-album-page="detail" → 单册页（照片墙 + 灯箱）

   为什么要「对齐行」而不是 CSS grid / columns：
     · 定宽方格里照片会被裁成同一个形状，横竖混着的相簿看不出差别；
     · CSS columns 是按列填的，时间顺序会读成"从上往下、再跳到第二列"。
   对齐行（每行等高、按真实长宽比定宽、行宽铺满容器）既保住每张的真实比例，
   又让顺序老老实实从左到右、从上到下 —— 这是看相簿的顺序。

   数据来自 assets/js/photos-data.js（由 tools/photos-data.py 生成）；
   图片来自 Cloudflare R2（见下面 CDN / CDN_V），仓库里只有 webp 的本地副本、不进 git。

   日期政策（2026-09-21 主人「相册移除日期的资料，点击照片可以显示日期」）：
   版面上一个日期都不出现 —— 相簿墙的数据条、每格封面下、单册页标题下都撤了；
   日期只在点开照片后由灯箱的说明行给出，且只到日（不带时分）。
   所以别再把 first/last 往 DOM 里塞，数据里留着是给以后做筛选用的。

   灯箱（2026-09-21 起）：**不在本文件里**。单册页点图放大走的是全站唯一的共享引擎
   （assets/js/lightbox.js + assets/css/lightbox.css），与动态页同一份代码；
   本文件只负责把「这一组是谁、叫什么、哪天拍的」交给它。详见 renderDetail 里的那段。

   返回位置（2026-09-21 晚，主人「点击相册，再点击返回全部相簿，放回到上次相册滑动的
   地方比较好」）：墙上点进一册、再点单册页的「← 全部相簿」，墙要回到离开时那一段。
   两个 sessionStorage 键（rm-album-wall / rm-album-back）与 why 见二号段。
   =========================================================================== */
(function () {
  'use strict';

  var DATA = window.RM_PHOTOS;
  var page = document.body.getAttribute('data-album-page');
  if (!DATA || !page) return;

  /* 照片从 R2 出货（2026-09-23），仓库里不再留 webp —— 与动态页那 58 张同一套做法。
     文件名就是拍摄时间戳、内容不会再变，所以缓存可以常年 immutable；
     唯一会"同名换内容"的情况是重跑 tools/photos-derive.py，那时候把 CDN_V 加一。

     ⚠️ photos/ 在桶根，**不在 images/ 里**（2026-09-23，主人「cloudflare 上 photo 的
     文件夹不要放进 image 里，参考我仓库的设计」）—— 照抄仓库的 assets/ 结构：
     照片是 assets/photos/、插画与卡片是 assets/images/，两边平级；R2 这边同样
     photos/ 与 images/ 平级。images/ 底下只剩 hero / projects / vslide（非照片）。 */
  var CDN = 'https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/photos';
  var CDN_V = '?v=1';

  var view = function (slug, base) { return CDN + '/' + slug + '/' + base + '.webp' + CDN_V; };
  var thumb = function (slug, base) { return CDN + '/_thumbs/' + slug + '/' + base + '.webp' + CDN_V; };

  /* 2024-01-13 14:34:44 → 2024.01.13（只到日，不带时分）。
     原来还带一个 withTime 开关 + 区间版 ym()/span()，2026-09-21 日期退出版面后
     全站唯一消费者只剩灯箱，就都删了 —— 留着是三条没人走的岔路。 */
  function stamp(s) {
    return s ? s.slice(0, 10).replace(/-/g, '.') : '';
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* 图到位那一下的交接（2026-09-21 主人「优化图片没加载出来时空图片底板的设计」）：
     图没到时格子显示的是底板（--plate-*，见 style.css 的 :root），原来图一到就是从底板
     硬切成照片 —— 因为 img 的 transition 只有 transform。这里补 0.4s 淡入（--img-fade）。

     三路兜底，缺一路就会偶发"永远一块空底板"：
       · complete 已为真 → 立刻点亮（缓存命中时 load 可能在本函数跑之前就烧过了）
       · load   → 点亮
       · error  → 见下面「破图」那段（2026-09-23 起不再当成功处理）
     ⚠️ 初始的"透明"必须由这里加 .is-pending —— CSS 里默认透明的话，脚本一挂
     全站照片就都不出现；而现在脚本挂了顶多是硬切，照片照旧。（progressive enhancement）

     ⚠️ 同一个 src 只淡一次：paint() 在 resize 时会整面墙重建，重挂 .is-pending
     会让已经看过的照片在每次拖窗口时集体闪一遍。

     ── 破图（2026-09-23 主人「网页上没加载出来的照片的底片设计有点不好看，显示有问题」）──
     原来 error 也走 done()，理由是"宁可让人看见裂图的 alt，也别留一块永远的空底板"。
     代价是那枚浏览器破图图标 + alt 文字直接压在底板上，一格是小图标跟字挤在角落，
     一整面墙就是一片噪声。现在失败改走两条路：
       · 这一张**第一次**失败 → 隔 BROKEN_RETRY_MS 换一个带时间戳的 URL 再试一次。
         能救回来的正是最常见的那两类：缓存里存着的失败结果、边缘节点的偶发 5xx。
       · 再失败 / 已经连着倒了好几张 → 才认定是破图：img 隐形，底板正中一枚细线图形
         （规则与色值在 style.css 的「破图兜底」那段，本文件只负责挂类）。
     ⚠️ 连续失败到 BROKEN_OUTAGE_AT 张就不再逐张重试 —— 断网或整桶挂掉时，每张各发一次
       重试等于把失败请求翻倍，而结果一张也不会变；有一张成功就清零重新开始。
     ⚠️ .is-broken 要 **img 与容器各挂一次**：底板上那枚图形是容器的 ::after
       （img 是替换元素，挂不上伪元素）。 */
  var BROKEN_RETRY_MS = 1200;
  var BROKEN_OUTAGE_AT = 3;
  var failStreak = 0;

  function brokenMark(img, on) {
    img.classList[on ? 'add' : 'remove']('is-broken');
    var box = img.parentNode;
    if (box && box.classList) box.classList[on ? 'add' : 'remove']('is-broken');
  }

  var fadedOnce = Object.create(null);
  function fadeIn(img) {
    var key = img.getAttribute('src');
    if (key && fadedOnce[key]) return;
    if (key) fadedOnce[key] = 1;
    img.classList.add('is-pending');
    var done = function () {
      failStreak = 0;
      brokenMark(img, false);
      img.classList.remove('is-pending');
      img.classList.add('is-loaded');
    };
    var failed = function () {
      failStreak += 1;
      if (!img.dataset.retried && failStreak < BROKEN_OUTAGE_AT) {
        img.dataset.retried = '1';
        setTimeout(function () {
          /* ⚠️ 只往后加一个查询参数，别动 ?v= —— 那个管的是盖版本，重试要的恰恰是
             **绕过**缓存里那次失败的记录。 */
          img.src = img.src + (img.src.indexOf('?') < 0 ? '?' : '&') + 'r=' + Date.now();
        }, BROKEN_RETRY_MS);
        return;                        /* 仍压在 .is-pending 上：底板照旧，不闪 */
      }
      img.classList.remove('is-pending');
      brokenMark(img, true);
    };
    /* complete 已为真时 load/error 可能早在本函数之前就烧过了。⚠️ 光看 complete 不够：
       缓存里存的是一次失败时 complete 也为真 —— 要靠 naturalWidth 才分得清成败；
       而"压根没设 src"的图（complete 为真、naturalWidth 也是 0）不算破图，仍然点亮。 */
    if (img.complete) {
      if (img.getAttribute('src') && !img.naturalWidth) failed(); else done();
      return;
    }
    img.addEventListener('load', done);
    img.addEventListener('error', failed);
  }

  /* =========================================================================
     一、相簿墙（photos.html）
     ========================================================================= */
  function renderWall() {
    var stats = document.getElementById('albumStats');
    var wall = document.getElementById('albumWall');
    if (!stats || !wall) return;

    /* 只留三格纯计数：起讫区间格（.album-stat--range）2026-09-21 撤掉 */
    var s = DATA.stats;
    [
      [s.albums, '个相簿'],
      [s.photos, '张照片'],
      [s.regions, '个地区'],
    ].forEach(function (row) {
      var box = el('div', 'album-stat');
      box.appendChild(el('span', 'album-stat-v', String(row[0])));
      box.appendChild(el('span', 'album-stat-k', row[1]));
      stats.appendChild(box);
    });

    var frag = document.createDocumentFragment();
    DATA.albums.forEach(function (a, i) {
      var tile = el('a', 'album-tile');
      tile.href = 'album.html?slug=' + encodeURIComponent(a.slug);

      var cover = el('div', 'album-tile-cover');
      var img = document.createElement('img');
      img.src = thumb(a.slug, a.cover);
      img.alt = a.zh + '　' + a.note;
      img.width = 900;
      img.height = 675;
      /* 首屏那几张别等懒加载，否则滚动时一片空灰 */
      if (i < 4) { img.loading = 'eager'; img.fetchPriority = 'high'; }
      else { img.loading = 'lazy'; }
      img.decoding = 'async';
      fadeIn(img);
      cover.appendChild(img);
      cover.appendChild(el('span', 'album-tile-count', a.count + ' 张'));
      tile.appendChild(cover);

      tile.appendChild(el('h3', 'album-tile-name', a.zh));
      tile.appendChild(el('p', 'album-tile-note', a.note));
      frag.appendChild(tile);
    });

    wall.appendChild(frag);
    document.documentElement.classList.add('album-wall-ready');

    /* 一进一出都在这儿接上（二号段）。顺序无所谓，但**必须留在 renderWall 里**：
       墙的 DOM 刚铺好、文档高度就是最终值，这是整个加载过程里最早能安全滚动的时刻。 */
    rememberWallSpot(wall);
    restoreWallSpot();
  }

  /* ⛔ 这里原来有 `fitWideTiles()` + `.album-tile--wide`（让开头 N 本跨 2 列 × 2 行，
     把占格数凑成列数的整数倍，末行就不留洞）。2026-09-21 主人两次退回后**整段删除**：
       ① 第一版只跨 2 列、与普通行同高 ⇒ 槽位 2.773:1，而封面全是 4:3 ⇒
          上下各切 26%、只剩中间 48% 的横带，主人说「第 1、2 张相册显示异常」；
       ② 第二版改成跨 2 列 × 2 行（槽位 1.27:1、裁切 0%）⇒ 主人原话
          **「不是第 1、2 相册为什么大了？做得和其他相册一样就行」**。
     ⇒ 结论：本数变化时**每本都还是那个尺寸**。19 本（2026-09-23 加 polyu 后）在桌面
     4 列下排 5 行、末行坐 3 本、右侧空 1 格（1168 容器下 ≈300px）—— 那个洞主人认了，
     **别再想任何"填空"的法子**（收口文案块 / 跨列宽格 / 塞卡，三种都被退过）。
     唯一能"一样大且不留洞"的路子是让列数整除本数 —— 19 是质数，只有 1 列或 19 列，
     等于换版面节奏，主人没要，别自作主张。 */

  /* =========================================================================
     二、离开 / 回到相簿墙：把位置放回原位
     （2026-09-21 晚 主人「点击相册，再点击返回全部相簿，放回到上次相册滑动的地方比较好」）

     病根：从墙上点进某一册、再点单册页的「← 全部相簿」，那是一次**新导航**
     （<a href="photos.html">）。浏览器只在前进/后退时才还原滚动位置，新导航一律从墙顶
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
        快照本身就在原位 —— 落点是"从头就在那儿"，不是"淡进来之后再滑过去"。 */
  var WALL_Y_KEY = 'rm-album-wall';
  var WALL_BACK_KEY = 'rm-album-back';

  /* sessionStorage 一律包一层：隐私模式/配额异常时抛错，页面照旧能用（渐进增强） */
  function store(fn) {
    try { return fn(); } catch (e) { return null; }
  }

  /* 离开墙：记下这一刻的滚动位置 */
  function rememberWallSpot(wall) {
    wall.addEventListener('click', function (e) {
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
       不触发页面开场动画」）。打一个类，两个消费者：
         · CSS（style.css 末尾那条）用它关掉标题的逐字弹出；
         · loader.js —— 它在本文件**之后**才执行，看到类就直接 page-ready + 摘幕布，
           不再等跨文档快照 ⇒ 页面"直接就在那儿"。
       ⚠️ 这一行必须写在下面那几个 early-return **之前**：从墙顶（want = 0）点进某一册
          再回来时没什么位置可"放回"，但"不播开场"照样要生效 —— 判据是"点了那个返回
          链接"，不是"有位置可放回"。 */
    document.documentElement.classList.add('album-back-instant');

    var want = parseInt(store(function () { return sessionStorage.getItem(WALL_Y_KEY); }) || '', 10);
    if (!isFinite(want) || want <= 0) return;            /* 0 = 本来就在墙顶，没什么可放回的 */

    var maxY = function () { return Math.max(0, document.documentElement.scrollHeight - window.innerHeight); };
    if (maxY() <= 0) return;                             /* 文档还没铺开：别把位置钉死在 0 */
    window.scrollTo(0, Math.min(want, maxY()));

    /* 兜底一次（load 时）：字体到位后末行可能再往下挪一点，刚才够不到的位置这时就够得到。
       ⚠️ 用户一旦自己动了滚轮/按键就立刻让位 —— 为了几像素把人家的滚动抢回去，比不修更烦。 */
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

  /* 单册页：页顶「← 全部相簿」。它同时是「这一次是点返回来的」那个信号源 ——
     墙看到标志才会把位置放回去（二号段）。新标签页打开时不写，见 rememberWallSpot 那条。 */
  function backLink() {
    var a = el('a', 'album-back', '← 全部相簿');
    a.href = 'photos.html';
    a.addEventListener('click', function (e) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      store(function () { sessionStorage.setItem(WALL_BACK_KEY, '1'); });
    });
    return a;
  }

  /* =========================================================================
     三、对齐行布局
     输入：容器可用宽 + 一组 {w,h}（真实像素）+ 目标行高
     输出：每行的 {items, height}
     规则：一个相簿里横竖混着，要让每张都保住真实比例、行宽又铺满容器，
          只有"每行等高、行内按比例定宽"这一条路。

     关键细节：贪心地"塞到超过容器宽就收行"会系统性偏矮 —— 目标 262px、容器 1136px、
     照片全 4:3 时，塞 4 张算出 218px（差 17%），而塞 3 张是 282px（差 8%）：
     3 张虽然已经不铺满，但**更接近目标**，行高也更齐。所以这里不是"超过就收"，
     而是把跨过目标的两个候选都算出来、挑误差小的那个。
     （踩过：第一版正是"超过就收"，结果中间几行 215px、末行 262px，一眼就不齐。）
     ========================================================================= */
  function rows2layout(items, avail, gap, target) {
    var minH = Math.max(96, target * 0.52);
    var maxH = target * 1.8;
    var ar = function (it) { return it.w / it.h || 1; };
    var clamp = function (h) { return Math.max(minH, Math.min(maxH, h)); };
    var hOf = function (n, sum) { return clamp((avail - gap * (n - 1)) / sum); };

    var rows = [];
    var i = 0;
    while (i < items.length) {
      /* 超宽全景：压到最矮也宽过整行 —— 独占一行，高度按容器宽反算（不夹紧，否则会溢出） */
      if (ar(items[i]) * minH > avail) {
        rows.push({ items: [items[i]], height: Math.round(avail / ar(items[i])) });
        i += 1;
        continue;
      }
      var n = 0, sum = 0, bestN = 1, bestSum = ar(items[i]), bestErr = Infinity;
      while (i + n < items.length) {
        n += 1;
        sum += ar(items[i + n - 1]);
        var h = hOf(n, sum);
        var err = Math.abs(h - target);
        if (err < bestErr) { bestErr = err; bestN = n; bestSum = sum; }
        /* 已经矮过目标了，再塞只会更矮 —— 跨过点就停 */
        if (h <= target) break;
      }
      var height = hOf(bestN, bestSum);
      /* 末行不拉伸：宁可左边留白，也别把最后两三张撑成大图 */
      if (i + bestN >= items.length) height = Math.min(height, target);
      rows.push({ items: items.slice(i, i + bestN), height: Math.round(height) });
      i += bestN;
    }
    return rows;
  }

  /* =========================================================================
     四、单册页（album.html）+ 灯箱
     ========================================================================= */
  function renderDetail() {
    var slug = new URLSearchParams(location.search).get('slug');
    var idx = DATA.albums.map(function (a) { return a.slug; }).indexOf(slug);
    var hero = document.getElementById('albumHero');
    var strip = document.getElementById('albumStrip');
    var nav = document.getElementById('albumNav');

    if (idx < 0) {
      document.title = '找不到这本相簿 — rain.meow';
      hero.innerHTML = '';
      hero.appendChild(backLink());
      hero.appendChild(el('h1', 'album-title', '找不到这本相簿'));
      hero.appendChild(el('p', 'about-hero-desc', '链接里的 slug 对不上，回相簿清单挑一本吧'));
      return;
    }

    var a = DATA.albums[idx];
    document.title = a.zh + ' — rain.meow';
    var desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', a.zh + '：' + a.note + '　' + a.count + ' 张照片');

    hero.innerHTML = '';
    hero.appendChild(backLink());
    hero.appendChild(el('p', 'album-eyebrow', a.region));
    hero.appendChild(el('h1', 'album-title', a.zh));
    hero.appendChild(el('p', 'about-hero-desc', a.note));
    /* 元信息一行说完：张数 · 英文名。
       原来用 <br> 硬断成两行（「28 张」独自一行、英文名再一行），和上面的 desc
       只隔 14px、下面又空一截 —— 三行 12.5px 小字叠在标题下，读起来像三条互不相干
       的注脚，也是这一区"看着不对"的主要来源。合成一行后少一行、少一道间距，
       计数回到句子里面（2026-09-21 主人「UI 设计得不是很好看」）。 */
    var meta = el('p', 'album-hero-meta');
    meta.appendChild(document.createTextNode(a.count + ' 张'));
    meta.appendChild(el('span', 'album-hero-meta-sep', '·'));
    meta.appendChild(document.createTextNode(a.en));
    hero.appendChild(meta);

    /* ---- 照片墙 ---- */
    var shots = a.photos.map(function (p) {
      return { base: p[0], w: p[1], h: p[2], cap: p[3], at: p[4] };
    });
    var nodes = [];

    function paint() {
      var avail = strip.clientWidth;
      if (!avail) return;
      var gap = parseFloat(getComputedStyle(strip).getPropertyValue('--strip-gap')) || 8;
      var target = avail < 620 ? 168 : avail < 1000 ? 224 : 262;
      var rows = rows2layout(shots, avail, gap, target);

      strip.innerHTML = '';
      nodes = [];
      var seq = 0;
      rows.forEach(function (r, ri) {
        var rowEl = el('div', 'album-strip-row');
        r.items.forEach(function (it) {
          var b = el('button', 'album-shot');
          b.type = 'button';
          b.style.height = r.height + 'px';
          b.style.width = Math.floor(r.height * (it.w / it.h)) + 'px';
          var im = document.createElement('img');
          im.src = thumb(a.slug, it.base);
          im.alt = it.cap || a.zh;
          im.decoding = 'async';
          im.loading = seq < 12 ? 'eager' : 'lazy';
          fadeIn(im);
          b.appendChild(im);
          /* 日期还在 aria-label 里 —— 按钮没有可见文字，念屏的人只能从这儿听到底是哪张 */
          b.setAttribute('aria-label', '放大：' + (it.cap || a.zh) + '　' + stamp(it.at));
          b.dataset.i = String(seq);
          rowEl.appendChild(b);
          nodes.push(b);
          seq++;
        });
        strip.appendChild(rowEl);
      });
      strip.classList.add('album-strip-ready');
    }

    paint();
    var rt = 0;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(paint, 140);
    }, { passive: true });

    /* ---- 灯箱（全站唯一一套：assets/js/lightbox.js）----
       2026-09-21 主人「相册页点击浏览图片的引擎和动态页点击浏览图片的引擎使用同一套」：
       本页原来自己那套（淡入淡出 + 左右箭头 + 手写滑动手势 + 手写 Esc/方向键）整体删掉，
       换成动态页跑了十几轮的那套引擎 —— 32px 出-进淡滑 / 拖动跟手 / 触控板手势 /
       环形翻页 / 圆点 / 手机横屏，两个页面现在是同一份代码在跑。

       2026-09-21（晚）主人「浏览照片不用名字和日期了。浏览照片的UI做的和动态页一样吧」：
       **本页不再往灯箱传 cap / meta** —— 画面底下那行「说明 · 日期」整体不出现，
       灯箱版面和动态页逐像素相同（`--lb-cap-h` 回到 0 ⇒ band 变薄 ⇒ 画面跟着变大，
       1440×900 的 4:3 从 896×672 变 980×735，与动态页一致）。
       ⚠️ 别把这一句读成"把引擎的说明行删了"：cap/meta 是**可选**字段，引擎那边
          原样留着；唯一还在用那一行的是「张数超过圆点上限（>18）」时的「当前 / 总数」
          —— 石硖尾 52 张、尖沙咀 28 张、油麻地 20 张、科大 19 张这 4 本会只剩计数，
          这与动态页在同样张数下的行为是同一条规则（动态页现在最多的帖子 12 张，
          所以那边看不到它）。
       ⚠️ 名字与日期**只剩 .album-shot 的 aria-label** 里有（见上面那行，看不见、
          只念给读屏）；墙上没有别的去处。要一并去掉得先想清楚念屏的人怎么知道点的是哪张。

       本页只负责把"这一组是谁"说清楚，字段与引擎的约定：
         src  原图（view 档 1440）—— 墙上那张是 480 缩图，放大要看真的
         alt  给 <img>（读屏用，也是图没加载出来时的替身）
       灯箱的排版（与画面的净空、张数超过圆点上限时补「当前 / 总数」）
       全在引擎里算 —— 本页不写任何尺寸，也不碰 .dy-lb-* 的内部状态。 */
    var lbList = shots.map(function (p) {
      return {
        src: view(a.slug, p.base),
        alt: p.cap || a.zh,
        /* 缩略图（2026-09-21 晚）：灯箱底部预览带用。给 480 缩图 —— 墙上用的是**同一个 URL**
           已经加载过 ⇒ 直接命中缓存（实测 52 枚 52/52），等于白送。 */
        thumb: thumb(a.slug, p.base),
      };
    });

    strip.addEventListener('click', function (e) {
      var b = e.target.closest('.album-shot');
      if (!b || !window.RMLightbox) return;
      window.RMLightbox.open(lbList, Number(b.dataset.i));
    });

    /* ---- 吸顶册条：2026-09-21 撤掉 ----
       第一刀（同日晚）曾在 <body> 上挂过一条 46px 的固定条，滑动时从导航栏底下滑出来，
       放「← 全部相簿　← 上一册　n / m　下一册 →」。主人 2026-09-21 晚：
       「现在滑动时不要有，全部相册和上一页/下一页在导航栏下面弹出来」。
       ⇒ JS（buildAlbumBar）与 CSS（整块 .album-bar）一起删干净，别只注释掉一半。
       现在单册页只有两处导航入口：页顶左上角的「← 全部相簿」（`.album-back`），
       与页脚那对 `.album-nav`（三栏 grid + 箭头 + 「n / m」）。 */

    /* ---- 上一册 / 下一册（页脚）----
       2026-09-21 晚主人：「只可以点击上一页/下一页，上一页/下一页的名字不可以点击，
       名字移到上一页/下一页的上面。优化全部相簿/上一页/下一页的按钮大小。」
       ⇒ 一册 = 一个竖块（`.album-nav-side`）：
            上面  名字 `<span class="album-nav-n">`   ← **不是链接**（点它什么都不该发生）
            下面  按钮 `<a class="album-nav-link">`，字只有「← 上一册」/「下一册 →」
       方向箭头还在按钮里（原来只有四个字，方向全靠左右位置暗示）；「n / m」计数仍放中间。
       三栏交给 CSS 的 grid（1fr auto 1fr），中间那格才是真居中。 */
    if (nav) {
      var total = DATA.albums.length;
      var prev = DATA.albums[(idx - 1 + total) % total];
      var next = DATA.albums[(idx + 1) % total];
      [
        [prev, 'prev', '← 上一册'],
        null,
        [next, 'next', '下一册 →'],
      ].forEach(function (row) {
        if (!row) {
          nav.appendChild(el('span', 'album-nav-idx', (idx + 1) + ' / ' + total));
          return;
        }
        var side = el('div', 'album-nav-side album-nav-side--' + row[1]);
        /* 名字先入：纯展示节点，与下面的按钮是兄弟关系 —— 别塞进 <a> 里 */
        side.appendChild(el('span', 'album-nav-n', row[0].zh));
        var link = el('a', 'album-nav-link album-nav-' + row[1]);
        link.href = 'album.html?slug=' + encodeURIComponent(row[0].slug);
        link.appendChild(el('span', 'album-nav-k', row[2]));
        side.appendChild(link);
        nav.appendChild(side);
      });
    }
  }

  /* 墙这边**没有** resize 监听（原来那条只服务已删除的 fitWideTiles()）——
     墙的版面由 CSS 的 auto-fill 自己响应视口，不需要 JS 插手。
     （单册页那边的 resize 监听在 renderDetail 里，管的是对齐行重排，别跟这条搞混。） */
  if (page === 'wall') renderWall();
  else if (page === 'detail') renderDetail();
})();
