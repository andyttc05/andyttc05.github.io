/* 全屏加载页控制器（第一百四十六批 2026-08-22 主人"加载逻辑不是简单的是/否开关，
   而是一套精细的、基于时间、场景和用户感知的决策系统"）
   决策模型 —— 三个维度综合，而不是"就绪→消失"的单点开关：

   [时间]
   - 就绪耗时（performance.now 实测）：秒开（< 350ms）连淡出都省，直接移除 —— 防"闪一下"；
   - 最短展示：首访 900ms / 回访 450ms —— 用户感知上"加载页存在过"才自然；
   - 兜底上限：快网 6s / 慢网 12s —— 资源卡死也绝不锁页面（HTML 内联脚本还有 load+2s 兜底）。

   [场景]
   - bfcache 恢复（pageshow persisted）：内容已在内存，立即移除，绝不闪现；
   - 页面重轻：index 有 hero 大图 + 5 屏 vslide 最重，about 次之，coming-soon 最轻 ——
     loading 期间锁滚动只在真正需要时发生（页面加载完即释放，最短展示内不额外拖）；
   - 网络档位（navigator.connection.effectiveType）：2g/slow-2g 判定慢网，
     最短展示 + 上限同步放宽（慢网用户多给真实加载时间，避免"加载页先消失内容还空"）。

   [用户感知]
   - 首访 vs 回访（sessionStorage 标记）：首访多停留让品牌印记落地，回访尽量不打扰；
   - 秒开跳过：感知"即点即开"，而不是机械地每次都播一遍加载页；
   - 兜底上限语义是"绝不锁死"，不是"拖时间"：就绪即走，只保证最短展示不低于感知阈值。

   就绪信号：window load + document.fonts.ready + 【首屏关键图片 complete】
   （第一百五十四批 2026-08-23 主人"加载页面要等图片都加载出来才放行，
   手机版滑动时图片才刚加载好"）：
   - window load 不等 loading="lazy" 的图片；vslide 五幕雨图原为 lazy，
     加载页放行后滚动到五幕雨才开始加载 = "滑动时图片才刚加载好"。
     已把 vslide 图改为 eager（5 张共 ~550KB，可接受），并在此显式等待
     【所有非 lazy 图片】complete（hero 立绘 + vslide 五幕雨）—— 放行时
     首屏与五幕雨图片全部就绪，滚动不再卡图。
   - 兜底：MAX_WAIT（快网 6s / 慢网 12s）保证图片卡死也不锁页面。
   就绪同时：<html> 加 .page-ready 类 + 派发 pageReady 事件 ——
   script.js 的 hero 入场（.entered）/ 打字机 / about 标题弹出都靠它才播。
   兜底：本文件异常未加载时，HTML 里的小段内联脚本也会在 load+2s 后强制解除。
   注意：不写 prefers-reduced-motion 降级 —— 与全站约定一致（主人系统开减弱动态，
   写了动画会被静默关掉）。 */
(function () {
  var loader = document.getElementById('pageLoader');
  if (!loader) return; /* 页面没有加载页（noscript 已隐藏等）直接跳过 */
  var html = document.documentElement;
  var done = false;

  /* --- 决策输入 --- */
  var startT = performance.now();
  /* 导航类型：navigate / reload / back_forward（bfcache 恢复会被 pageshow 单独处理） */
  var navEntry = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || null;
  var navType = navEntry ? navEntry.type : 'navigate';
  /* 网络档位：2g/slow-2g = 慢网 */
  var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  var effType = conn && conn.effectiveType ? conn.effectiveType : '4g';
  var slowNet = effType === '2g' || effType === 'slow-2g';
  /* 首访/回访：sessionStorage 标记（页面会话内首次） */
  var seen = false;
  try { seen = sessionStorage.getItem('rm-loader-seen') === '1'; } catch (e) {}
  try { sessionStorage.setItem('rm-loader-seen', '1'); } catch (e) {}

  /* --- 决策参数 --- */
  var SKIP_FAST_MS = 350;            /* 就绪耗时低于此 → 秒开，直接移除不淡出 */
  var MIN_SHOW_MS = seen ? 450 : 900; /* 最短展示：回访 450 / 首访 900（品牌落地） */
  var MAX_WAIT_MS = slowNet ? 12000 : 6000; /* 兜底上限：快网 6s / 慢网 12s */

  html.classList.add('page-loading'); /* 锁滚动（style.css: html.page-loading overflow hidden） */

  function release(skipFade) {
    if (done) return;
    done = true;
    html.classList.remove('page-loading');
    html.classList.add('page-ready');
    try { document.dispatchEvent(new CustomEvent('pageReady')); } catch (e) {}
    if (skipFade) {
      /* 秒开 / bfcache：连淡出都省，直接移除（防闪一下） */
      if (loader.parentNode) loader.parentNode.removeChild(loader);
      return;
    }
    loader.classList.add('is-done');
    setTimeout(function () {
      if (loader.parentNode) loader.parentNode.removeChild(loader);
    }, 600);
  }

  /* bfcache 恢复：页面从往返缓存回来，内容早已渲染 → 立即移除加载页，绝不闪现 */
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) release(true);
  });

  /* 就绪信号 1：window load + 字体就绪（原逻辑） */
  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  var loaded = new Promise(function (res) {
    if (document.readyState === 'complete') res();
    else window.addEventListener('load', res, { once: true });
  });

  /* 就绪信号 2（第一百五十四批）：所有【非 lazy 图片】complete。
     loading="lazy" 的图片（about 页技能图标等）滚动才加载，不在此列 ——
     只等首屏/五幕雨关键图（hero 立绘 + vslide 已改 eager），
     确保放行时这些图一定渲染完成，滚动不再"图才刚加载好"。
     已 complete 的直接过；未 complete 的挂 load/error（error 也放行，
     图片加载失败不该锁住加载页）。 */
  function eagerImagesReady() {
    return new Promise(function (res) {
      var imgs = Array.prototype.slice.call(document.images || []);
      var pending = imgs.filter(function (im) {
        return !im.complete && !im.getAttribute('loading');
      });
      if (!pending.length) { res(); return; }
      var left = pending.length;
      function one() {
        left--;
        if (left <= 0) res();
      }
      for (var i = 0; i < pending.length; i++) {
        var im = pending[i];
        if (im.complete) { one(); continue; }
        im.addEventListener('load', one, { once: true });
        im.addEventListener('error', one, { once: true });
      }
    });
  }

  Promise.all([loaded, fontsReady, eagerImagesReady()]).then(function () {
    var elapsed = performance.now() - startT;
    if (elapsed < SKIP_FAST_MS) { release(true); return; }
    /* 已就绪但还没到最短展示：等剩余时间再淡出（感知上"加载页存在过"） */
    var rest = Math.max(0, MIN_SHOW_MS - elapsed);
    setTimeout(function () { release(false); }, rest);
  }).catch(function () {
    /* fonts.ready reject 等异常：不锁页面，按最短展示兜底 */
    setTimeout(function () { release(false); }, Math.min(MIN_SHOW_MS, 600));
  });

  /* 兜底上限：资源卡死也不锁页面（慢网放宽） */
  setTimeout(function () { release(false); }, MAX_WAIT_MS);
})();
