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
  if (el.getAttribute('mobile') === 'false' && /Android|webOS|iPhone|iPod|iPad|BlackBerry/i.test(navigator.userAgent)) return;

  function getAttr(name, fallback) {
    var v = el.getAttribute(name);
    return v === null ? fallback : v;
  }
  /* 当前主题的 accent 色（CSS 变量 --color-accent-rgb），读不到则回退蓝 #2563eb */
  function accentRGB() {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue('--color-accent-rgb').trim();
      if (v) return v.replace(/\s+/g, '');
    } catch (e) {}
    return '37,99,235';
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
  var MIN_COUNT = 14, MAX_COUNT = 200;
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
    w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    /* 高清：物理像素 = CSS 像素 × dpr，配合 setTransform 保持逻辑坐标系不变（Retina 下线条锐利不发虚） */
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    /* 视口变了（如手机旋转、桌面切窗口）→ 同步调整粒子数到当前目标值，
       保持视觉密度恒定。trim 尾部多余粒子；不足时按当前视口随机补点 */
    syncPoints();
  }

  var points = [];
  var mouse = { x: null, y: null, max: 20000 };
  /* 鼠标最后移动时刻：静止超过 60ms 即视为"鼠标静止"，停止驱逐粒子 */
  var lastMoveAt = 0;

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

  function step() {
    ctx.clearRect(0, 0, w, h);
    var all = [mouse].concat(points);
    var mouseMoving = (Date.now() - lastMoveAt) < 60;
    points.forEach(function (p) {
      p.x += p.xa;
      p.y += p.ya;
      p.xa *= (p.x > w || p.x < 0) ? -1 : 1;
      p.ya *= (p.y > h || p.y < 0) ? -1 : 1;
      /* 点绘制取整到像素格：消除 dpr 下浮点坐标落在物理像素间产生的闪烁抖动 */
      ctx.fillRect(Math.round(p.x) - 0.5, Math.round(p.y) - 0.5, 1, 1);
      all.forEach(function (o) {
        if (p !== o && o.x !== null && o.y !== null) {
          var dx = p.x - o.x, dy = p.y - o.y, d2 = dx * dx + dy * dy;
          if (d2 < o.max) {
            /* 仅在鼠标移动时推开粒子：鼠标静止时不再驱逐，消除围绕鼠标的来回弹跳 */
            if (o === mouse && d2 >= o.max / 2 && mouseMoving) { p.x -= 0.03 * dx; p.y -= 0.03 * dy; }
            var a = (o.max - d2) / o.max;
            ctx.beginPath();
            ctx.lineWidth = a / 2;
            ctx.strokeStyle = 'rgba(' + config.color + ',' + (a + 0.2) + ')';
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(o.x, o.y);
            ctx.stroke();
          }
        }
      });
      all.splice(all.indexOf(p), 1);
    });
    requestAnimationFrame(step);
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', function (e) {
    mouse.x = e.clientX; mouse.y = e.clientY;
    lastMoveAt = Date.now();
  });
  window.addEventListener('mouseout', function () { mouse.x = null; mouse.y = null; });
  window.addEventListener('touchmove', function (e) {
    var t = e.touches && e.touches[0];
    if (t) { mouse.x = t.clientX; mouse.y = t.clientY; lastMoveAt = Date.now(); }
  });
  window.addEventListener('touchend', function () { mouse.x = null; mouse.y = null; });

  /* 用目标粒子数初始化（桌面 99，移动按视口面积等比缩），不再写死 config.count */
  syncPoints();
  setTimeout(step, 100);

  /* 主题联动接口：script.js 在切换主题时调用 setColor(当前 accent rgb) */
  window.RainNest = {
    setColor: function (rgb) { config.color = rgb; }
  };
})();
