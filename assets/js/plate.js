/* ===========================================================================
   图片「底板 → 照片」的交接（2026-09-25，方案 B 静态化时从 photos.js 抽出来）

   2026-09-21 主人「优化图片没加载出来时空图片底板的设计」：
   图没到时格子显示的是底板（--plate-*，见 style.css 的 :root），图一到就 0.4s 淡入
   （--img-fade），不是从底板硬切成照片。
   2026-09-23 主人「没加载出来的照片的底片设计有点不好看」：失败的照片不再走浏览器那套
   破图图标 + alt，改成底板 + 正中一枚细线图形（规则与色值在 style.css 的「破图兜底」段）。

   为什么单独一个文件、而且要**内联**进页面：
     方案 B 把照片直接铺进 HTML ⇒ 图片从**解析期**就开始下，比 defer 的 photos.js
     （DCL 之后）早得多。交接若还等 photos.js，缓存命中的图会在脚本跑到之前就画完 ——
     用户看到的是"啪"地弹出来，淡入等于没了。所以要跟布局引擎（album-strip.js）一样，
     在解析期就把 load / error 接上。
     ⚠️ 单一真相源：tools/photos-data.py 生成页面时把这个文件逐字节抄进
       photos.html 与 19 个单册页（`<!--RM-BEGIN inline:...-->` 那段）。改这里必须重跑
       生成器；stamp.mjs 的 INLINE 检查会比对内联副本与源文件是否逐字节相同。

   ⚠️ 三路兜底，缺一路就会偶发"永远一块空底板"：
       · complete 已为真 → 立刻点亮（缓存命中时 load 可能在本函数跑之前就烧过了）
       · load   → 点亮
       · error  → 走破图那条路（2026-09-23 起不再当成功处理）
   ⚠️ 初始的"透明"必须由这里加 .is-pending —— CSS 里默认透明的话，脚本一挂
     全站照片就都不出现；而现在脚本挂了顶多是硬切，照片照旧。（progressive enhancement）
   ⚠️ 同一个 src 只淡一次：resize 重排会重新扫一遍容器，重挂 .is-pending
     会让已经看过的照片集体闪一遍。
   ⚠️ .is-broken 要 **img 与容器各挂一次**：底板上那枚图形是容器的 ::after
     （img 是替换元素，挂不上伪元素）。
   =========================================================================== */
(function () {
  'use strict';

  var BROKEN_RETRY_MS = 1200;
  /* 连续失败到这么多张就不再逐张重试 —— 断网或整桶挂掉时，每张各发一次重试
     等于把失败请求翻倍，而结果一张也不会变；有一张成功就清零重新开始。 */
  var BROKEN_OUTAGE_AT = 3;
  var failStreak = 0;
  var fadedOnce = Object.create(null);

  function brokenMark(img, on) {
    img.classList[on ? 'add' : 'remove']('is-broken');
    var box = img.parentNode;
    if (box && box.classList) box.classList[on ? 'add' : 'remove']('is-broken');
  }

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

  /* 扫一遍容器里还没交接过的照片。三个消费点（相簿封面 / 单册照片墙 / 动态页照片格）
     共用 style.css 里那一段破图规则；这里只管把类挂上。 */
  function hydrate(root) {
    var imgs = (root || document).querySelectorAll('.album-tile-cover img, .album-shot img');
    for (var i = 0; i < imgs.length; i++) fadeIn(imgs[i]);
  }

  window.RMPlate = { hydrate: hydrate, fadeIn: fadeIn };
})();
