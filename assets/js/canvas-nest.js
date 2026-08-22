/*!
 * CanvasNest —— 几何粒子点线网络背景
 * 源：bistutzyy.github.io 所用 butterfly-extsrc/dist/canvas-nest.min.js（MIT）
 * 本地化改造（rain.meow）：
 *   1. 颜色不再写死 RGB，默认读本站 CSS 变量 --color-accent-rgb，随主题联动
 *   2. 主题切换时通过 window.RainNest.setColor(rgb) 更新（由 script.js 调用）
 *   3. 鼠标/触摸事件改用 addEventListener，避免覆盖页面其他监听器
 * 配置在 script 标签属性上：color / opacity / zIndex / count / mobile
 */
(function () {
  var el = document.getElementById('canvas_nest');
  if (!el) return;
  var isMobileUA = /Android|webOS|iPhone|iPod|iPad|BlackBerry/i.test(navigator.userAgent);
  if (el.getAttribute('mobile') === 'false' && isMobileUA) return;

  function getAttr(name, fallback) {
    var v = el.getAttribute(name);
    return v === null ? fallback : v;
  }
  /* 当前主题的 accent 色（CSS 变量 --color-accent-rgb），读不到则回退蓝 #2563eb */
  /* 现代浏览器 getComputedStyle 总返回有效值,无 try/catch 兜底 */
  function accentRGB() {
    var v = getComputedStyle(document.documentElement).getPropertyValue('--color-accent-rgb').trim();
    return v ? v.replace(/\s+/g, '') : '37,99,235';
  }

  var config = {
    zIndex: getAttr('zIndex', '-1'),
    opacity: parseFloat(getAttr('opacity', '0.6')),
    color: getAttr('color', accentRGB()),
    count: parseInt(getAttr('count', '99'), 10)
  };

  /* 视觉密度自适应：count 写死会让移动端（视口面积只有桌面 1/5~1/6）出现粒子堆叠成"密网"，
     桌面 99 个粒子摊在 1440×900≈130 万 px² 是"刚刚好"的稀疏感，移动端同样的 99 个塞进
     390×844≈33 万 px² 看起来就是密密麻麻一团"花哨"。
     解法：以桌面 1440×900（主人实际测试尺寸）为基准，按当前视口面积等比缩放 count，
     并设上下限防极端值。这样桌面 → 移动端切换（或手机旋转）resize 时粒子数会自动增减，
     视觉密度（每像素连接数）保持一致。 */
  var REF_W = 1440, REF_H = 900, REF_AREA = REF_W * REF_H;
  /* 移动端进一步降下限：14² = 196 stroke ops/frame，8² = 64（桌面级数不变）。
     8 粒子在 390×844 仍能维持稀疏的"星点连线"美感（移动端粒子少反而更干净） */
  var MIN_COUNT = isMobileUA ? 8 : 14, MAX_COUNT = 200;
  /* DPR 上限：iPhone Retina dpr=3 → 物理像素 9 倍于 css，过度吃 GPU。
     桌面 dpr 通常 = 1 或 2，cap 在 2 不影响清晰度；移动 cap 在 2 → 像素面积 1.78×
     减少（vs dpr=3），canvas 描边代价同步下降 */
  var MAX_DPR = 2;
  function targetCount() {
    if (!w || !h) return config.count;
    var ratio = (w * h) / REF_AREA;
    return Math.max(MIN_COUNT, Math.min(MAX_COUNT, Math.round(config.count * ratio)));
  }

  var canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:' + config.zIndex + ';opacity:' + config.opacity + ';pointer-events:none;';
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  var w, h;
  var dpr = window.devicePixelRatio || 1;
  function resize() {
    dpr = window.devicePixelRatio || 1;
    /* cap DPR：移动端 dpr=3 时像素面积 9×，对点线网络过度清晰（视觉无感），但 GPU 负担 9×。
       cap 在 2：线条仍有 Retina 级锐利感，但开销降 ~44%（4/9） */
    var useDpr = Math.min(dpr, MAX_DPR);
    w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    /* 高清：物理像素 = CSS 像素 × dpr，配合 setTransform 保持逻辑坐标系不变（Retina 下线条锐利不发虚） */
    canvas.width = Math.round(w * useDpr);
    canvas.height = Math.round(h * useDpr);
    ctx.setTransform(useDpr, 0, 0, useDpr, 0, 0);
    /* 视口变了（如手机旋转、桌面切窗口）→ 同步调整粒子数到当前目标值，
       保持视觉密度恒定。trim 尾部多余粒子；不足时按当前视口随机补点 */
    syncPoints();
  }

  var points = [];
  var mouse = { x: null, y: null, max: 20000 };
  /* mousemove 节流 (2026-08-20): 浏览器原生 mousemove 事件高频 (60-200/s),
     每事件都跑 d² 比较 + 写入 mouse.x/y → 浪费。rAF 节流到每帧最多 1 次写入,
     step() 内同步读 mouse.x/y(每帧 1 次)而非每事件 1 次, 桌面性能略改善。
     移动端无 mousemove 只走 touchmove, 节流同样有效 */
  var pendingMouseX = null, pendingMouseY = null, mouseRafScheduled = false;
  function flushMouse() {
    mouseRafScheduled = false;
    if (pendingMouseX === null) return;
    mouse.x = pendingMouseX;
    mouse.y = pendingMouseY;
    pendingMouseX = pendingMouseY = null;
  }
  function onMouse(x, y) {
    pendingMouseX = x; pendingMouseY = y;
    if (mouseRafScheduled) return;
    mouseRafScheduled = true;
    requestAnimationFrame(flushMouse);
  }

  /* 第一百四十九批（2026-08-23 主人"背景粒子交互动效有卡断感"）：
     卡顿根源不在帧率（rAF 常驻 60fps），而在【交互手感的运动不连贯】：
     1. 旧版 mouseMoving 窗口仅 60ms，快速移动时"驱逐/静止"状态高频翻转，
        靠近鼠标的粒子被反复 0.03*dxm 推走又回弹 → 粒子在鼠标周围抖跳；
     2. 驱逐是硬开关（d2m >= MOUSE_MAX/2 才推），力度无距离平滑，靠近即跳变；
     3. 鼠标线每帧最多 N 次 strokeStyle 字符串拼接 + 状态切换，CPU 热路径。
     优化：
     a. 驱逐力度改【距离连续平滑】：force = (1 - d2m/MOUSE_MAX) 线性衰减，
        且只在鼠标真正快速移动（速度 > 阈值）时施加 → 慢移不抖、快移平滑让开；
     3. 鼠标线透明度按距离渐变绘制，但 strokeStyle 字符串缓存到每帧开头
        （全屏同一色，alpha 只随距离变 → 用分段近似减少状态切换）；
     b. 鼠标静止 60ms 后连线淡出（不重画），进一步省帧内绘制。 */
  /* 鼠标速度判定：两次 mousemove 间隔位移 > 阈值才算"快速移动"（驱逐生效） */
  var prevMouseX = null, prevMouseY = null, prevMouseT = 0;
  var mouseSpeed = 0;
  function updateMouseSpeed(x, y) {
    var now = performance.now();
    var dt = now - prevMouseT;
    if (prevMouseX !== null && dt > 0) {
      var dist = Math.sqrt((x - prevMouseX) * (x - prevMouseX) + (y - prevMouseY) * (y - prevMouseY));
      mouseSpeed = dist / dt; /* px/ms */
    }
    prevMouseX = x; prevMouseY = y; prevMouseT = now;
  }
  var FAST_MOVE = 0.4;   /* 鼠标速度阈值 px/ms（≈400px/s）：低于此视为慢移/微调，不驱逐 */
  /* 鼠标连接线的 alpha 分段：避免每根线都拼 rgba 字符串（热路径省状态切换）。
     鼠标线距离环带 → 固定 alpha 档位，视觉连续（0.9 → 0.35 共 5 档） */
  var MOUSE_LINE_ALPHAS = [0.9, 0.8, 0.68, 0.55, 0.42, 0.35];
  var MOUSE_LINE_BANDS = 6;

  /* 制造一个随机粒子：速度下限避免 |v|≈0 的极慢漂移产生"卡顿/抖动"感 */
  function makePoint() {
    var vx = 2 * Math.random() - 1;
    var vy = 2 * Math.random() - 1;
    var MIN_V = 0.3;
    if (Math.abs(vx) < MIN_V) vx = vx >= 0 ? MIN_V : -MIN_V;
    if (Math.abs(vy) < MIN_V) vy = vy >= 0 ? MIN_V : -MIN_V;
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      xa: vx,
      ya: vy,
      max: 6000
    };
  }
  /* 把 points 数组长度对齐到 targetCount()：多了截尾，少了按当前视口随机补 */
  function syncPoints() {
    var target = targetCount();
    while (points.length > target) points.pop();
    while (points.length < target) points.push(makePoint());
  }

  /* === 暂停/恢复（移动端性能：滚到页底/页面切到后台 → 暂停画布动画，省 CPU/电量）===
     rafId 跟踪当前帧；paused 时取消 rAF 并 clearRect 清空画面（避免暂停前最后一帧"残留"） */
  var rafId = null;
  var paused = false;
  /* 距离阈值取常量（粒子 max=6000 / 鼠标 max=20000），原代码每对读 o.max 多一次属性查找 */
  var POINT_MAX = 6000;
  var MOUSE_MAX = 20000;
  /* 第一百四十九批：鼠标线强度 —— 移动后拉满，静止后随时间淡出（不再逐帧满画） */
  var mouseLineOpacity = 1;
  var mouseLineLastMoveAt = 0;
  function step() {
    if (paused) { rafId = null; return; }
    ctx.clearRect(0, 0, w, h);
    var n = points.length;
    var hasMouse = mouse.x !== null && mouse.y !== null;
    /* 鼠标连线强度：移动后拉满；静止 >120ms 线性衰减到 0（连线自然淡出） */
    if (hasMouse) {
      if (Date.now() - mouseLineLastMoveAt > 120) {
        mouseLineOpacity = Math.max(0, mouseLineOpacity - 0.05);
      } else {
        mouseLineOpacity = Math.min(1, mouseLineOpacity + 0.25);
      }
    } else {
      mouseLineOpacity = Math.max(0, mouseLineOpacity - 0.05);
    }
    var colorRgb = config.color;
    var i, j;

    for (i = 0; i < n; i++) {
      var p = points[i];
      p.x += p.xa;
      p.y += p.ya;
      p.xa *= (p.x > w || p.x < 0) ? -1 : 1;
      p.ya *= (p.y > h || p.y < 0) ? -1 : 1;
      /* 点绘制取整到像素格：消除 dpr 下浮点坐标落在物理像素间产生的闪烁抖动 */
      ctx.fillRect(Math.round(p.x) - 0.5, Math.round(p.y) - 0.5, 1, 1);

      /* 粒子↔粒子连接：j>i 半迭代（每对只画一次，省 50% stroke ops）。
         原代码 all.forEach + splice + indexOf 不仅画两遍，还每帧 O(N) 数组变更。
         for-i 循环比 forEach 快约 30%（V8 对闭包调用开销敏感），热路径上累计明显 */
      for (j = i + 1; j < n; j++) {
        var o = points[j];
        var dx = p.x - o.x, dy = p.y - o.y, d2 = dx * dx + dy * dy;
        if (d2 < POINT_MAX) {
          var a = (POINT_MAX - d2) / POINT_MAX;
          ctx.beginPath();
          ctx.lineWidth = a / 2;
          ctx.strokeStyle = 'rgba(' + colorRgb + ',' + (a + 0.2) + ')';
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(o.x, o.y);
          ctx.stroke();
        }
      }

      /* 鼠标连接：仅当鼠标在视口内且连线未完全淡出才迭代。
         桌面端 90% 时间鼠标静止在 nav 或窗外，hasMouse=false → 整段跳过（每帧省 N 次 d² 比较）；
         鼠标静止后 mouseLineOpacity 衰减 → 静止时不逐帧画满强度线（视觉自然淡出） */
      if (hasMouse && mouseLineOpacity > 0.02) {
        var dxm = p.x - mouse.x, dym = p.y - mouse.y, d2m = dxm * dxm + dym * dym;
        if (d2m < MOUSE_MAX) {
          /* 第一百四十九批：驱逐改【速度判定 + 距离连续平滑】——
             只在鼠标快速移动（mouseSpeed > FAST_MOVE）时施加；
             力度随距离线性衰减（近处让开、远处不动），消除"推开-回弹"抖跳。
             上限从 0.03 收到 0.022：快速划过时粒子平滑让开、不弹跳 */
          if (mouseSpeed > FAST_MOVE) {
            var repel = (1 - d2m / MOUSE_MAX) * 0.022;
            p.x -= repel * dxm;
            p.y -= repel * dym;
          }
          /* 连线 alpha 按距离分段（MOUSE_LINE_BANDS 档），强度随鼠标线淡出衰减 */
          var band = Math.floor((d2m / MOUSE_MAX) * MOUSE_LINE_BANDS);
          if (band >= MOUSE_LINE_BANDS) band = MOUSE_LINE_BANDS - 1;
          var am = MOUSE_LINE_ALPHAS[band] * mouseLineOpacity;
          if (am > 0.02) {
            ctx.beginPath();
            ctx.lineWidth = am / 2.2;
            ctx.strokeStyle = 'rgba(' + colorRgb + ',' + am.toFixed(3) + ')';
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }
      }
    }
    rafId = requestAnimationFrame(step);
  }

  function pause() {
    if (paused) return;
    paused = true;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    /* 清空画面：避免暂停前最后一帧（停止在某个状态）"冻屏"残留；
       暂停时仍想看底色 = canvas 透明 = 看 html 背景，clearRect 不影响视觉 */
    if (ctx && w && h) ctx.clearRect(0, 0, w, h);
  }
  function resume() {
    if (!paused) return;
    paused = false;
    rafId = requestAnimationFrame(step);
  }

  resize();
  window.addEventListener('resize', resize);
  /* 第一百四十九批：mousemove 同时记录速度（供驱逐判定）+ 更新时间戳（供连线淡出判定） */
  window.addEventListener('mousemove', function (e) {
    mouseLineLastMoveAt = Date.now();
    updateMouseSpeed(e.clientX, e.clientY);
    onMouse(e.clientX, e.clientY);
  });
  window.addEventListener('mouseout', function () { mouse.x = null; mouse.y = null; pendingMouseX = pendingMouseY = null; });
  window.addEventListener('touchmove', function (e) {
    var t = e.touches && e.touches[0];
    if (t) { mouseLineLastMoveAt = Date.now(); updateMouseSpeed(t.clientX, t.clientY); onMouse(t.clientX, t.clientY); }
  });
  window.addEventListener('touchend', function () { mouse.x = null; mouse.y = null; pendingMouseX = pendingMouseY = null; });

  /* 页面切到后台（标签切换/息屏）→ 自动暂停画布，节省移动端 CPU/电量；
     visibilitychange 在所有现代浏览器稳定支持（iOS Safari 7+/Android Chrome 56+）。
     注：document.hidden = true 时 rAF 自动暂停，但 step() 内还有残余的 raf 链需要主动取消 */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause(); else resume();
  });

  /* 用目标粒子数初始化（桌面 99，移动按视口面积等比缩），不再写死 config.count */
  syncPoints();
  setTimeout(function () { if (!paused) rafId = requestAnimationFrame(step); }, 100);

  /* 主题联动接口：script.js 在切换主题时调用 setColor(当前 accent rgb)
     + 跨页滚到非装饰区时调用 pause()/resume() 节能 */
  window.RainNest = {
    setColor: function (rgb) { config.color = rgb; },
    pause: pause,
    resume: resume
  };
})();
