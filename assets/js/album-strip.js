/* ===========================================================================
   单册照片墙的「对齐行」引擎（2026-09-25，方案 B 静态化时从 photos.js 抽出来）

   为什么单独一个文件、而且要**内联**进页面：
     方案 B 把单册页的照片全铺进 HTML（图片从解析期就开始下），但「对齐行」的几何
     算不出来 —— 行高取决于容器可用宽，而容器宽随视口变。实测（见
     ~/.workbuddy/scratch/album-static-b-2026-09-25/strip-compare.mjs）：
     用 CSS flex-wrap 近似，171 例里 94 例偏离 >8%、最差总高差 262px（整整一行）
     ⇒ 纯 CSS 复现不了 rows2layout 的「跨过目标的两侧里挑误差小的那个」规则。
     而布局若留给 defer 的 photos.js（DCL 才跑），页面会在跨文档过渡中途重排一下。
     ⇒ 唯一的出路：几何在**解析期、零网络**算完，也就是内联。
     ⚠️ 所以本文件是**单一真相源**：tools/photos-data.py 生成页面时把这个文件
       逐字节抄进每个单册页（`<!--RM-BEGIN inline:assets/js/album-strip.js-->` 那段）。
       改这里必须重跑生成器，否则线上还是旧几何 —— stamp.mjs 的 INLINE 检查会拦。

   ⚠️ 内联脚本会**等 head 里的样式表**（规范如此：解析器插入的经典脚本要等
      待加载中的样式表）—— 正好是我们要的：跑到这一行时 style.css 已就位，
      `strip.clientWidth` 与 `--strip-gap` 都是真值，不会算出错误的行。

   输入：容器里散着的 `.album-shot` 按钮（静态铺好，每个带 `style="--ar:<w/h>"`）
   输出：每行一个 `.album-strip-row`（行等高、行内按真实比例定宽、行宽铺满容器）
   =========================================================================== */
(function () {
  'use strict';

  /* ---- 对齐行布局：整册一次算完（DP）----
     输入：容器可用宽 + 一组 {w,h}（真实像素）+ 目标行高
     输出：每行的 {items, height, fit}（height = 取整后的 DOM 高度；fit = 未取整的渲染高，定宽用）

     规则：一个相簿里横竖混着，要让每张都保住真实比例、行宽又铺满容器，
          只有"每行等高、行内按比例定宽"这一条路。

     2026-09-25 换算法（原来是逐行贪心）。贪心只看得见眼前这一行 ——
     塞到跨过目标就收行，末行剩几张它不管。实测（1440，19 册）：
     polyu / central-wanchai / kai-tak 末行各只剩 1 张、右边空 819px，
     disneyland 整册空洞 1445px、中间还有一行单张被夹到 472px（比邻行矮 64%）。
     现在整册一次算完（DP，N ≤ 60 张，O(N²) 可忽略），代价函数三项相加：

         10000 · ((h − target) / target)²      行高偏离目标的平方
       +   900 · |1 − fill|                   行宽没铺满的比例（= 洞）
       + 12000                                孤张行（整册不止一张时）

     末行照旧「不拉伸」（h cap 到 target）：宁可右边留白，也别把最后两三张撑成大图。
     结果：洞从 819px 量级降到 100px 量级，整册页高矮 350px 上下，行高反而更齐
     （disneyland 从 229~472 收到 262~313）。
     ⚠️ 中间试过"只搬末两行"的局部均衡：会把邻行撑到 434px，比洞还难看，已否决。

     ⚠️ 本函数现在是**唯一一份**（photos.js 已改成只调 RMAlbumStrip.paint，不再自带几何）。
        19 个单册页里内联的是**副本** ⇒ 改完必须重跑 tools/photos-data.py，
        stamp.mjs 的 INLINE 检查会拦"源文件与内联副本不一致"。 */
  function rows2layout(items, avail, gap, target) {
    var minH = Math.max(96, target * 0.62);
    var maxH = target * 1.8;
    var ar = function (it) { return it.w / it.h || 1; };
    var clamp = function (h) { return Math.max(minH, Math.min(maxH, h)); };
    var N = items.length;
    if (!N) return [];

    /* 前缀和：items[a..b) 的长宽比之和 */
    var pre = [0], i, j;
    for (i = 0; i < N; i++) pre.push(pre[i] + ar(items[i]));

    /* items[a..b) 摆成一行的代价。
       ⚠️ 返回两个高度，别混用：
          nat = (avail − gap·(n−1)) / Σar   —— **未夹紧**的自然高度，只给「还能不能再塞一张」判断用
          fit = clamp(nat)，末行再 cap 到 target —— **真正渲染**的高度（未取整），行内定宽用它
       把 nat 写成 fit 会让 `nat < minH` 这条中断永远不成立，于是 DP 会去选那些
       「自然高低于下限、被 clamp 抬上来」的行 —— 抬上来就等于行宽超过容器
       （实测 390 下 +68px、页面横向滚动 52px）。 */
    var cost = function (a, b, isLast) {
      var n = b - a, sum = pre[b] - pre[a];
      /* 超宽全景：压到最矮也宽过整行 —— 独占一行，高度按容器宽反算（不夹紧，否则会溢出） */
      if (n === 1 && ar(items[a]) * minH > avail) {
        var hp = avail / ar(items[a]);
        return { h: Math.round(hp), nat: hp, fit: hp, fill: 1,
                 c: Math.pow((hp - target) / target, 2) * 10000 };
      }
      var nat = (avail - gap * (n - 1)) / sum;
      var fit = clamp(nat);
      if (isLast) fit = Math.min(fit, target);
      var fill = (fit * sum + gap * (n - 1)) / avail;
      var c = Math.pow((fit - target) / target, 2) * 10000 + 900 * Math.abs(1 - fill);
      if (n === 1 && N > 1) c += 12000;
      return { h: Math.round(fit), nat: nat, fit: fit, fill: fill, c: c };
    };

    /* best[j] = 前 j 张的最小总代价；from[j]/meta[j] 记回推路径 */
    var INF = Infinity, best = [], from = [], meta = [];
    for (i = 0; i <= N; i++) { best.push(INF); from.push(-1); meta.push(null); }
    best[0] = 0;
    for (j = 1; j <= N; j++) {
      for (i = j - 1; i >= 0; i--) {
        if (best[i] === INF) continue;
        var n = j - i, r = cost(i, j, j === N);
        /* nat 关于张数单调递减 ⇒ 自然高已经矮过下限就别再往前找（全景那张本来就该被压矮，例外） */
        if (!(n === 1 && ar(items[i]) * minH > avail) && r.nat < minH) break;
        var tot = best[i] + r.c;
        if (tot < best[j]) { best[j] = tot; from[j] = i; meta[j] = r; }
      }
    }

    var rows = [];
    j = N;
    while (j > 0) {
      i = from[j];
      rows.push({ items: items.slice(i, j), height: meta[j].h, fit: meta[j].fit });
      j = i;
    }
    return rows.reverse();
  }

  /* 目标行高三档，与 photos.js 原来那行逐字相同 */
  function targetFor(avail) {
    return avail < 620 ? 168 : avail < 1000 ? 224 : 262;
  }

  /* 真实行间距（像素）。
     🔴 别写 parseFloat(getComputedStyle(strip).getPropertyValue('--strip-gap')) ——
     那个值在 style.css 里是 `clamp(6px, 0.7vw, 10px)`，parseFloat 直接得 NaN，
     然后静默落进 `|| 8` 兜底。而真实渲染出来的间距是 1440→10px、1280→8.96、
     1100→7.7、768→6px ⇒ 每行比容器宽 6px（768 下反而窄 4px），
     照片墙右缘跟上面的标题、数据条差一条竖线（页面不横向滚动，6px 被 main 的内边距吃掉，
     所以肉眼只会觉得"没对齐"，很难想到是间距读错）。
     正解：挂一枚探针，让**浏览器**去解析那个 clamp —— CSS 保持唯一真相源。 */
  function readGap(strip) {
    var probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;' +
                          'width:var(--strip-gap);height:0';
    strip.appendChild(probe);
    var g = parseFloat(getComputedStyle(probe).width);
    strip.removeChild(probe);
    return g > 0 ? g : 8;
  }

  /* 把容器里散着的按钮排列成对齐行。幂等：可以反复调（首绘一次、resize 再调）。 */
  function paint(strip) {
    if (!strip) return;
    var shots = strip.querySelectorAll('.album-shot');
    if (!shots.length) return;
    var avail = strip.clientWidth;
    if (!avail) return;                       /* 还没被布局（display:none 等）→ 别把宽度钉成 0 */
    var gap = readGap(strip);
    var rows = rows2layout(toItems(shots), avail, gap, targetFor(avail));

    var frag = document.createDocumentFragment();
    for (var r = 0; r < rows.length; r++) {
      var rowEl = document.createElement('div');
      rowEl.className = 'album-strip-row';
      var row = rows[r];
      for (var k = 0; k < row.items.length; k++) {
        var it = row.items[k];
        it.el.style.height = row.height + 'px';
        /* 宽度按**未取整**的渲染高（row.fit）算再 floor ⇒ 行内各张之和 ≤ 行宽，
           右缘永不撑出容器（用取整后的高度算，那 0.5px 会被每张放大一次，一行能攒出 6px 溢出）。
           高度才取整，行与行之间不会有半像素缝。 */
        it.el.style.width = Math.floor((row.fit != null ? row.fit : row.height) * (it.w / it.h)) + 'px';
        rowEl.appendChild(it.el);
      }
      frag.appendChild(rowEl);
    }
    /* 按钮此时都已搬进 frag，清空容器只会丢掉旧的行壳子与散落的按钮壳 */
    strip.textContent = '';
    strip.appendChild(frag);
  }

  /* 每枚按钮的真实长宽比写在 `style="--ar:<w/h>"`（静态铺的时候由生成器写）——
     同时给 CSS 那条兜底当尺寸依据（引擎没跑起来时也不至于是空白）。 */
  function toItems(shots) {
    var items = [];
    for (var i = 0; i < shots.length; i++) {
      var ar = parseFloat(shots[i].style.getPropertyValue('--ar')) || 1.5;
      items.push({ el: shots[i], w: ar, h: 1 });
    }
    return items;
  }

  /* gap 也挂出来：探针脚本/以后排查"右缘差一条竖线"时不用再猜间距是多少 */
  window.RMAlbumStrip = { paint: paint, layout: rows2layout, targetFor: targetFor, gap: readGap };
})();
