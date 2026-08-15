/*!
 * Ribbons —— 动态几何飘带背景
 * 源：bistutzyy.github.io 所用 butterfly-extsrc/dist/canvas-fluttering-ribbon.min.js（MIT）
 * 本地化改造（rain.meow）：
 *   1. 颜色由 HSLA 彩色循环改为本站 accent 单色（默认读 --color-accent-rgb）
 *   2. 主题切换通过 window.RainRibbons.setColor(rgb) 联动（由 script.js 调用）
 *   3. 保留全部动画：飘带逐段淡入扫过全屏、animateSections 波动、滚动视差、播完自动再生
 */
(function () {
  function getCSSVar(name, fallback) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      if (v) return v.replace(/\s+/g, '');
    } catch (e) {}
    return fallback;
  }

  var config = {
    color: getCSSVar('--color-accent-rgb', '37,99,235'),
    colorAlpha: 0.22,         // 飘带整体透明度（降低：避免色块遮挡文字）
    verticalPosition: 'random',
    horizontalSpeed: 200,
    ribbonCount: 2,           // 减少条数：弱化存在感
    strokeSize: 0,
    parallaxAmount: -0.2,     // 滚动视差（原站调用值）
    animateSections: true
  };

  function rand(min, max) { return Math.random() * (max - min) + min; }
  function viewport() {
    return {
      width: window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth || 0,
      height: window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight || 0,
      scrollY: window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0
    };
  }

  /* 生成一条飘带的 section 链：从屏幕外一侧扫到对侧，逐段延迟登场 */
  function createSection(w, h) {
    var points = [];
    var dir = Math.random() > 0.5 ? 'right' : 'left';
    var startX = dir === 'right' ? -200 : w + 200;
    var startY = config.verticalPosition === 'random' ? rand(0, h)
      : config.verticalPosition === 'top' ? 200
      : config.verticalPosition === 'bottom' ? h - 200
      : h / 2;
    var c = { x: startX, y: startY };
    var d = { x: startX, y: startY };
    for (var r = 0; r < 1000; r++) {
      var sx = rand(-0.2, 1) * config.horizontalSpeed;
      var sy = rand(-0.5, 0.5) * (0.25 * h);
      var p = { x: d.x + (dir === 'right' ? sx : -sx), y: d.y + sy };
      if ((dir === 'right' && d.x >= w + 200) || (dir === 'left' && d.x <= -200)) break;
      points.push({
        point1: { x: c.x, y: c.y },
        point2: { x: d.x, y: d.y },
        point3: p,
        delay: 4 * r,
        dir: dir,
        alpha: 0,
        phase: 0
      });
      c = { x: d.x, y: d.y };
      d = p;
    }
    return points;
  }

  /* 绘制一个 section；返回 true 表示已播完（淡出）可移除 */
  function drawSection(ctx, section, scrollY) {
    if (section.phase >= 1 && section.alpha <= 0) return true;
    if (section.delay <= 0) {
      section.phase += 0.02;
      section.alpha = Math.sin(section.phase);
      section.alpha = Math.max(0, Math.min(section.alpha, 1));
      if (config.animateSections) {
        var t = 0.1 * Math.sin(1 + section.phase * Math.PI / 2);
        var dx = section.dir === 'right' ? t : -t;
        section.point1.x += dx; section.point2.x += dx; section.point3.x += dx;
        section.point1.y += t; section.point2.y += t; section.point3.y += t;
      }
    } else {
      section.delay -= 0.5;
    }
    var a = section.alpha * config.colorAlpha;
    if (a <= 0) return false;
    ctx.save();
    if (config.parallaxAmount !== 0) ctx.translate(0, scrollY * config.parallaxAmount);
    ctx.beginPath();
    ctx.moveTo(section.point1.x, section.point1.y);
    ctx.lineTo(section.point2.x, section.point2.y);
    ctx.lineTo(section.point3.x, section.point3.y);
    ctx.fillStyle = 'rgba(' + config.color + ',' + a + ')';
    ctx.fill();
    if (config.strokeSize > 0) {
      ctx.lineWidth = config.strokeSize;
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    ctx.restore();
    return false;
  }

  var canvas = document.createElement('canvas');
  /* z-index:-2 压到粒子网络(-1)之下：飘带退到最远层，更虚更不挡内容 */
  canvas.style.cssText = 'display:block;position:fixed;top:0;left:0;width:100%;height:100%;z-index:-2;pointer-events:none;';
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, scrollY = 0, dpr = 1;

  function resize() {
    var v = viewport();
    dpr = window.devicePixelRatio || 1;
    /* 高清：物理像素 = CSS 像素 × dpr，setTransform 保持逻辑坐标（Retina 下飘带锐利） */
    W = v.width; H = v.height;
    canvas.width = Math.round(v.width * dpr);
    canvas.height = Math.round(v.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function onScroll() { scrollY = viewport().scrollY; }

  var sections = [];
  function animate() {
    ctx.clearRect(0, 0, W, H);
    sections.forEach(function (list, idx) {
      if (!list) return;
      list = list.filter(function (sec) { return !drawSection(ctx, sec, scrollY); });
      sections[idx] = list.length ? list : null;
    });
    sections.forEach(function (list, idx) {
      if (!list) sections[idx] = createSection(W, H);
    });
    requestAnimationFrame(animate);
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', onScroll, { passive: true });
  for (var i = 0; i < config.ribbonCount; i++) sections.push(createSection(W, H));
  animate();

  /* 主题联动接口：script.js 在切换主题时调用 setColor(当前 accent rgb) */
  window.RainRibbons = {
    setColor: function (rgb) { config.color = rgb; }
  };
})();
