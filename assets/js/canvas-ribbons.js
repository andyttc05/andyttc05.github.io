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

  /* 第三百一十一批（2026-09-23 主人「背景的丝带出现闪烁问题」）：撤回 30fps 闸门。
     第三百一十批曾在此加过帧率闸门（物理量全乘 k = 本帧时长/16.667ms，墙钟速度不变），
     省下常驻主线程 6.97pt —— 但丝带是「大面积、低对比（colorAlpha 0.22）、慢速的整屏元素」：
     帧率砍半 = 每帧亮度台阶 ×1.7、台阶频率 ÷2 ⇒ 从「60Hz 融合掉」掉进「30Hz 看得见」。

     实测（headless chromium 1440×900 @DPR2；探针 ~/.workbuddy/scratch/perf-idle-2026-09-23/
     ribbon-temporal.js，只统计「画布确实被重绘」的帧，量 α 通道的下采样帧间差分）：
       60fps：重绘间隔 16.7ms，每帧 maxΔα 中位 11，Δ>2.5(≈1% 全幅) 的像素 57 个/25k
       30fps：重绘间隔 33.3ms，每帧 maxΔα 中位 19，Δ>2.5 的像素 160 个/25k
     ⇒ 台阶更大又更慢，正是人眼对大面积低对比区最敏感的那一段。

     🔴 第三百一十批的「逐像素 A/B diff ≈ 噪声地板 0」结构上看不见这件事：那个 A/B 冻住了
        时钟，比的是同一时刻的两张静止图 —— 永远比不出帧率差异。要判「降帧有没有副作用」
        必须量时间序列，静态差分不算数。
     🔴 结论：丝带不许降帧。

     常驻主线程占用对照（20s TaskDuration，1440×900 @DPR2，探针 cpu-ab.js）：
       两个 canvas 都 60fps + 旧 script.js 常驻循环（= 原状）  21.59pt
       两个都 60fps + 新 script.js 按需循环                     19.44pt
       丝带 60fps + 粒子 30fps（= 本文件现状）                  17.61pt
       两个都 30fps（已撤回的那版）                             10.64pt
     ⚠️ 同批单跑，量级可信、差值别当精确值（负载能让同配置两跑散 ±3pt）。

     🔴 第三百一十三批（2026-09-23，主人把「MAX_DPR 要不要降到 1.5 或 1」交给我定）：
        决定 = 不动，留 2。这个旋钮不省主线程。
        · 定种 + 三配置交错三轮（cpu-ab.js FREEZE_RNG=1，20s 窗口）：
            DPR2 20.83pt | DPR1.5 20.85pt（Δ+0.03）| DPR1 17.82pt（Δ−3.0，刚够离开噪声）
        · 反向验证：DPR3（像素 ×2.25）与 DPR2 同价（22.91 vs 23.59pt）⇒ 像素面积不是主项。
        · 实测每帧只有 ~20 次 fill（count-calls.js：丝带层 6133 fill / 300 次重绘）
          ⇒ 绘制调用数也不是主项。丝带那 6~7pt 买的是「每 16.7ms 交付一张全屏半透明层的
            新帧」这件事本身，与分辨率、与调用数都无关。
        · 视觉：DPR1.5 与 DPR2 在 1× 和 7× 下都分不出；只有 DPR1 看得出（丝带边缘变软，
          >8/255 的像素 0.31%、max 38/255）。拿「唯一看得出差别的一档」换「勉强 3pt」不划算。
        · 何况 headless 是软件光栅，与主人机器（GPU 合成）不可比 ⇒ 这点收益更不可信。
        要再省只能改视觉（减 ribbonCount / 缩画布 / 降帧），都是得主人批的改动。
        ⚠️ 早先账本里那行「丝带 60fps@DPR1 = 13.11pt（比 DPR2 省 4.5pt）」作废：那个探头
          没冻 Math.random ⇒ 每次布局不同、section 条数不同 ⇒ 同配置两跑就散 3~4pt，
          4.5pt 复现不出来。量这类 ≤5pt 的差异必须定种 + 交错（FREEZE_RNG=1）。

     ⚠️ 粒子网络（canvas-nest.js）的 30fps 闸门保留：它是细线与小点，面积小、闪烁阈值高，
        没有丝带这个问题。 */

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
  /* === 运行策略：只在「真有人在看」时跑（第三百一十四批 2026-09-23）===
     停表一律走 hold()（停 rAF、**不清画布**）—— pause() 会 clearRect 清空画面，那等于
     「背景动效凭空消失」，比冻住更容易被看见。三种停表理由（都不改观感）：
       ① document.hidden     标签切走 / 息屏 / 最小化（原来只有这一条）
       ② 窗口失焦 ≥ 60s      用户切去别的 app —— 这个窗口没人在看，rAF 却照跑
                             （visibilitychange 对「可见但失焦」不触发，这是主诉最可能的场景）
       ③ body.dy-lb-open     灯箱全屏遮罩打开。遮罩 = rgba(10,13,18,.86) + blur(8px)，
                             背后 alpha 0.22 的飘带在里面只剩 ~3% 亮度的模糊色块，
                             而遮罩每帧重算模糊正是因为背后画布每帧在变（双份浪费）
     ⚠️ 外部没有人调用 pause()/resume()（已核实：script.js 只调 setColor）。
        将来若要按滚动分区停表，请把理由加进 syncRun() 的判定，**别直接调 pause()** ——
        否则会与 ①②③ 互相覆盖。 */
  var IDLE_HOLD_MS = 60000;
  var idleOff = false, overlayOff = false, idleTimer = null;

  function hold() {
    if (paused) return;
    paused = true;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }
  function syncRun() {
    if (document.hidden || idleOff || overlayOff) hold(); else resume();
  }
  function armRun() {
    clearTimeout(idleTimer);
    idleOff = false;
    /* 失焦才开始计时：在别的 app 里待够 IDLE_HOLD_MS 才停；一回来（focus）立刻恢复 */
    if (!document.hasFocus()) {
      idleTimer = setTimeout(function () { idleOff = true; syncRun(); }, IDLE_HOLD_MS);
    }
    syncRun();
  }
  document.addEventListener('visibilitychange', armRun);
  window.addEventListener('focus', armRun);
  window.addEventListener('blur', armRun);
  /* 指针在页面上动过 = 有人在看：失焦窗口里也该醒过来。
     （窗口被别的窗口完全盖住时收不到 pointermove —— 正合适，那种情况就该停） */
  window.addEventListener('pointermove', function () { if (idleOff) armRun(); }, { passive: true });
  /* 灯箱开合：lightbox.js 在 body 上挂/摘 .dy-lb-open（open() / closeLb()） */
  new MutationObserver(function () {
    var on = document.body.classList.contains('dy-lb-open');
    if (on === overlayOff) return;
    overlayOff = on;
    syncRun();
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  for (var i = 0; i < config.ribbonCount; i++) sections.push(createSection(W, H));
  if (!paused) rafId = requestAnimationFrame(animate);
  armRun();   /* 首帧后立刻按策略判定一次（后台标签加载/带遮罩打开时直接停） */

  /* 对外接口：script.js 切主题时调 setColor。
     resume 导出 syncRun（而不是裸 resume）—— 外部说「恢复」时仍要过策略判定，
     免得一脚把 ①②③ 的停表理由踢翻。 */
  window.RainRibbons = {
    setColor: function (rgb) { config.color = rgb; },
    pause: pause,
    resume: syncRun
  };
})();
