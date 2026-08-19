/*!
 * Ribbons —— 动态几何飘带背景
 * 源：bistutzyy.github.io 所用 butterfly-extsrc/dist/canvas-fluttering-ribbon.min.js（MIT）
 * 本地化改造（rain.meow）：
 *   1. 颜色由 HSLA 彩色循环改为本站 accent 单色（默认读 --color-accent-rgb）
 *   2. 主题切换通过 window.RainRibbons.setColor(rgb) 联动（由 script.js 调用）
 *   3. 保留全部动画：飘带逐段淡入扫过全屏、animateSections 波动、播完自动再生
 *      （滚动视差 2026-08-18 归零：14 屏长页面下 -0.2 视差把飘带滚出视口，见 config 注释）
 */
(function () {
  function getCSSVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v ? v.replace(/\s+/g, '') : fallback;
  }

  var isMobileUA = /Android|webOS|iPhone|iPod|iPad|BlackBerry/i.test(navigator.userAgent);
  var config = {
    color: getCSSVar('--color-accent-rgb', '37,99,235'),
    colorAlpha: 0.22,         // 飘带整体透明度（降低：避免色块遮挡文字）
    verticalPosition: 'random',
    horizontalSpeed: 200,
    /* 移动端降 ribbonCount 到 1：2 条飘带 × 每条 ~500 section × 每帧 1 fillStyle
       = 1000 fillStyle/frame。降到 1 → 500/frame（移动 GPU 省一半）。
       单条飘带在 390×844 屏上仍能铺满视觉，存在感不丢 */
    ribbonCount: isMobileUA ? 1 : 2,
    strokeSize: 0,
    /* 滚动视差归零（2026-08-18）：本页高 ~14 屏，原站 -0.2 视差 = translate(0, scrollY*-0.2)，
       滚动 ~5 屏后飘带整体平移出视口（实测 y>4500 ribbons 全 0 像素）→ 下方页面动态背景缺失、
       滑动中无背景动效。归零后飘带恒定在视口内逐段扫过 + 波动，hero → 落眸笑歌触 全程在动 */
    parallaxAmount: 0,
    animateSections: true
  };
  /* DPR 上限：移动端 dpr=3 时物理像素 9×，单 fill 调用代价同步放大约 9×。
     cap 在 2 → 像素面积降至 4/9（约 44% 开销下降），飘带仍肉眼锐利 */
  var MAX_DPR = 2;

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

  /* 绘制一个 section；返回 true 表示已播完（淡出）可移除。
     视差 translate 是全局常量（所有 section 共用 scrollY*parallaxAmount），
     由 animate() 在外层 save/translate → restore，省掉每 section 两次 GPU 状态变更 */
  function drawSection(ctx, section) {
    if (section.phase >= 1 && section.alpha <= 0) return true;
    if (section.delay <= 0) {
      section.phase += 0.02;
      var sinP = Math.sin(section.phase);
      section.alpha = sinP < 0 ? 0 : (sinP > 1 ? 1 : sinP);
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
    var useDpr = Math.min(dpr, MAX_DPR);
    /* 高清：物理像素 = CSS 像素 × dpr，setTransform 保持逻辑坐标（Retina 下飘带锐利） */
    W = v.width; H = v.height;
    canvas.width = Math.round(v.width * useDpr);
    canvas.height = Math.round(v.height * useDpr);
    ctx.setTransform(useDpr, 0, 0, useDpr, 0, 0);
  }
  function onScroll() { scrollY = viewport().scrollY; }

  var sections = [];
  /* 暂停/恢复（移动端性能：滚到页底/页面切到后台 → 暂停飘带动画） */
  var rafId = null;
  var paused = false;
  function animate() {
    if (paused) { rafId = null; return; }
    ctx.clearRect(0, 0, W, H);
    /* 视差 translate 是全局常量（所有 section 共用同一偏移）—— 提到外层 save/restore，
       省 ~500 section × 2 save/translate/restore = 1500 GPU 状态变更/帧 */
    ctx.save();
    if (config.parallaxAmount !== 0) ctx.translate(0, scrollY * config.parallaxAmount);
    var needRecreate = false;
    for (var i = 0; i < sections.length; i++) {
      var list = sections[i];
      if (!list) { needRecreate = true; continue; }
      var next = null;
      for (var j = 0; j < list.length; j++) {
        /* drawSection 返回 true = 该 section 已淡完，从链上移除；
           等同于原 filter(keep where !drawSection) 语义 */
        if (!drawSection(ctx, list[j])) {
          if (!next) next = [];
          next.push(list[j]);
        }
      }
      sections[i] = (next && next.length) ? next : null;
      if (!sections[i]) needRecreate = true;
    }
    ctx.restore();
    if (needRecreate) {
      for (var k = 0; k < sections.length; k++) {
        if (!sections[k]) sections[k] = createSection(W, H);
      }
    }
    rafId = requestAnimationFrame(animate);
  }
  function pause() {
    if (paused) return;
    paused = true;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (ctx && W && H) ctx.clearRect(0, 0, W, H);
  }
  function resume() {
    if (!paused) return;
    paused = false;
    rafId = requestAnimationFrame(animate);
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', onScroll, { passive: true });
  /* 页面切到后台 → 自动暂停，节省移动端 CPU/电量 */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause(); else resume();
  });
  for (var i = 0; i < config.ribbonCount; i++) sections.push(createSection(W, H));
  if (!paused) rafId = requestAnimationFrame(animate);

  /* 主题联动接口：script.js 在切换主题时调用 setColor(当前 accent rgb)
     + 跨页滚到非装饰区时调用 pause()/resume() 节能 */
  window.RainRibbons = {
    setColor: function (rgb) { config.color = rgb; },
    pause: pause,
    resume: resume
  };
})();
