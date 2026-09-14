/* 全屏加载页控制器（第一百五十五批 2026-08-23 主人"等图片加载完才显示是过时做法，
   改成渐进式加载"）
   决策模型 —— 基于【时间 / 场景 / 用户感知】，而非"资源全到位才放行"：

   [时间]
   - 加载页的**可见性由 loader.js 控制**（loader.css 里默认 opacity:0）：
     它**只在页面确实慢了之后才被放出来**（REVEAL_AFTER_MS = 150ms），
     快网冷加载实测 0 帧出现；慢网才会露脸（2026-09-15 修）；
   - 就绪耗时（performance.now 实测）：就绪 < 350ms 且加载页还没被放出来 → 连淡出都省、直接移除；
     放出来过的一律走淡出（硬移除会闪掉一帧满屏浅色，详见 release()）；
   - 最短展示：首访 900ms / 回访 450ms —— 用户感知上"加载页存在过"才自然；
   - 兜底上限：快网 6s / 慢网 12s —— 资源卡死也绝不锁页面（HTML 内联脚本还有 load+2s 兜底）。

   [场景]
   - bfcache 恢复（pageshow persisted）：内容已在内存，立即移除，绝不闪现；
   - 页面重轻：index 有 hero 大图 + 5 屏 vslide 最重，about 次之，coming-soon 最轻 ——
     loading 期间锁滚动只在真正需要时发生（页面加载完即释放，最短展示内不额外拖）；
   - 网络档位（navigator.connection.effectiveType）：2g/slow-2g 判定慢网，
     最短展示 + 上限同步放宽（慢网用户多给真实加载时间，避免"加载页先消失内容还空"）。

   [用户感知 —— 渐进式加载]
   - 【关键变化（第一百五十五批）】就绪信号：window load + 字体就绪，不再等图片 ——
     浏览器"关键渲染路径"里图片默认不阻塞首屏，等图会人为拉长白屏；
     图片放给浏览器原生调度：首屏 hero 立绘带 fetchpriority=high 优先抢，
     vslide 五幕雨图 loading=lazy 滚到再下，技能图标/游戏 logo/联系方式图全 lazy；
     CSS 已有 .is-loaded 淡入兜底，图片未到时透明占位，绝不"啪"地弹出；
     用户体验："先看到结构/文字/导航 → 图片按需到位"，符合现代最佳实践。
   - 首访 vs 回访（sessionStorage 标记）：首访多停留让品牌印记落地，回访尽量不打扰；
   - 秒开跳过：感知"即点即开"，而不是机械地每次都播一遍加载页；
   - 兜底上限语义是"绝不锁死"，不是"拖时间"：就绪即走，只保证最短展示不低于感知阈值。

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
  var REVEAL_AFTER_MS = 150;         /* 到点还没就绪才把加载页放出来；先就绪 → 用户从头没见过它 */
  var SKIP_FAST_MS = 350;            /* 就绪耗时低于此 + 加载页还没放出来 → 秒开，直接移除不淡出 */
  var MIN_SHOW_MS = seen ? 450 : 900; /* 最短展示：回访 450 / 首访 900（品牌落地） */
  var MAX_WAIT_MS = slowNet ? 12000 : 6000; /* 兜底上限：快网 6s / 慢网 12s */

  html.classList.add('page-loading'); /* 锁滚动（style.css: html.page-loading overflow hidden） */

  /* 加载页的"出现"由这里决定（loader.css 里 #pageLoader:not(.is-shown){opacity:0}）——
     2026-09-15 主人"刷新页面时会闪"。原来加载页一进 DOM 就可见，于是两条快路径
     （秒开 < 350ms / 站内导航 nav-instant）只能靠"画出来之后再摘掉"，摘的那一下就是
     一帧满屏浅色闪掉；线上实测每页都中招（画过 1 帧：65~109ms 显示 → 同一毫秒消失）。
     现在它默认不可见，由本文件在**确实慢了**的时候才放出来（REVEAL_AFTER_MS）：
       · 150ms 内就绪 → 加载全程它一次都没画过（不是"画了再藏"）—— 快网下这是常态；
       · 到点还没就绪 → 放出来，之后按最短展示/就绪时间淡出。
     ⚠️ 2026-09-15 第一版只把"硬移除"改成"画过就淡出"，实测冷加载照样占 122~251ms 满屏
        （而内容是 30ms 就绪的）—— 因为原来第一帧就无条件放出来，而 load 永远晚于第一帧，
        "秒开直接移除"那条路根本走不到。**决定用户看不看得见的是放出来的时机，不是摘掉的方式。**
     闸门失效也兜住了：就算 loader.css 被缓存成没有 nav-instant 那条规则的旧版，
     这条"延迟到 REVEAL_AFTER_MS"的判定仍会让快网下的加载页画不出来。 */
  var shown = false;
  var revealTimer = setTimeout(function () {
    if (done) return;
    shown = true;
    loader.classList.add('is-shown');
  }, REVEAL_AFTER_MS);

  function release(skipFade) {
    if (done) return;
    done = true;
    clearTimeout(revealTimer); /* 还没放出来就绪了 → 定时器必须撤掉，否则它到点会把它放出来 */
    html.classList.remove('page-loading');
    html.classList.add('page-ready');
    try { document.dispatchEvent(new CustomEvent('pageReady')); } catch (e) {}
    if (skipFade && !shown) {
      /* 秒开 / bfcache / 站内导航：连淡出都省，直接移除 —— 前提是**它从没被放出来过**。
         ⚠️ 别把 `!shown` 去掉：那样"画了一帧再硬移除"会回来（就是这次的闪）。 */
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

  /* 就绪信号（第一百五十五批 渐进式加载）：
     仅依赖 window load + 字体就绪，不再等图片。
     - 关键 CSS（fonts.css / loader.css / style.css）会阻塞渲染直到就绪，
       所以 load 触发时页面样式已完整、首屏结构已绘制；
     - 首屏 hero 立绘有 fetchpriority=high + <link rel=preload> 抢带宽，
       正常网络下与 load 几乎同时到位或稍后淡入；
     - 视口外的 vslide / skills / games / contact 图全部 loading=lazy，
       滚到再下 —— 它们不属于"首屏可用"，本就不该卡加载页。
     兜底：fonts.ready reject 等异常按最短展示放行，绝不锁页面。 */
  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  var loaded = new Promise(function (res) {
    if (document.readyState === 'complete') res();
    else window.addEventListener('load', res, { once: true });
  });

  Promise.all([loaded, fontsReady]).then(function () {
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
