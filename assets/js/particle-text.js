/* ParticleText —— React Bits 组件 vanilla 移植版
   用途：hero 大标题「时雨时猫」粒子文字特效
   说明：
   - 纯原生 JS（站点无 React/构建工具），API 对齐原组件 props
   - 颜色不写死：init/refresh 时从 CSS 变量 --color-ink / --color-accent 解析，
     主题切换由 script.js 调 window.RainParticleText.refresh() 重采样
   - 移除 prefers-reduced-motion 降级：主人 macOS 常开「减弱动态效果」，
     写了会在 Safari/Chrome 被静默关掉（教训见 2026-08-15 工作日志）
   用法：
   <span class="particle-text" id="heroParticleText" data-text="时雨时猫"></span>
   （脚本在 </body> 前同步执行，自动查找 [data-particle-text] 容器初始化）
   */
(function () {
  var hexToRgb = function (hex) {
    var clean = String(hex || '').replace('#', '').trim();
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16)
    };
  };

  var mixRgb = function (from, to, amount) {
    return {
      r: Math.round(from.r + (to.r - from.r) * amount),
      g: Math.round(from.g + (to.g - from.g) * amount),
      b: Math.round(from.b + (to.b - from.b) * amount)
    };
  };

  var rgbToCss = function (rgb) { return 'rgb(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ')'; };

  /* hex 混色（返回 #rrggbb）：供主色 accent 混白出浅蓝点缀色 */
  var mixHex = function (hex, targetHex, amount) {
    var from = hexToRgb(hex);
    var to = hexToRgb(targetHex);
    if (!from || !to) return hex;
    var m = mixRgb(from, to, amount);
    return '#' + [m.r, m.g, m.b].map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('');
  };

  var clamp = function (value, min, max) { return Math.min(Math.max(value, min), max); };
  var easeOutCubic = function (t) { return 1 - Math.pow(1 - t, 3); };

  var resolveFontSize = function (value, container, fontWeight, fontFamily) {
    if (typeof value === 'number') return value;

    var probe = document.createElement('span');
    probe.textContent = 'M';
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    probe.style.fontSize = value;
    probe.style.fontWeight = String(fontWeight);
    probe.style.fontFamily = fontFamily;
    container.appendChild(probe);
    var size = parseFloat(window.getComputedStyle(probe).fontSize) || 96;
    probe.remove();
    return size;
  };

  var waitForFonts = async function (font) {
    if (!('fonts' in document)) return;
    try { await document.fonts.load(font); } catch (e) {}
    await document.fonts.ready;
  };

  /* 从 CSS 变量解析 hex 颜色（--color-ink / --color-accent 均为 #rrggbb） */
  var resolveCssColor = function (name, fallback) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
    } catch (e) {}
    return fallback;
  };

  var instances = [];

  function initParticleText(container, options) {
    if (!container) return null;
    /* 防重复初始化：同一容器已有实例则复用（避免叠加 canvas） */
    var existing = container.__particleTextInstance;
    if (existing) return existing;
    options = options || {};

    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    if (!ctx) return null;

    var cfg = {
      text: options.text || container.getAttribute('data-text') || 'React Bits',
      particleSize: options.particleSize != null ? options.particleSize : 2.8,
      density: options.density != null ? options.density : 3,
      colorVar: options.colorVar || '--color-accent',
      highlightVar: options.highlightVar || '--color-accent',
      color: options.color || '',
      highlightColor: options.highlightColor || '',
      scatter: options.scatter != null ? options.scatter : 84,
      gatherDuration: options.gatherDuration != null ? options.gatherDuration : 1500,
      stagger: options.stagger != null ? options.stagger : 380,
      pointerRepel: options.pointerRepel != null ? options.pointerRepel : 22,
      repelRadius: options.repelRadius != null ? options.repelRadius : 110,
      idleDrift: options.idleDrift != null ? options.idleDrift : 0.15,
      /* mount：登场特效只在首次加载播一次；hover 仅保留粒子被推开（repel），
         不再重复"散开→重组"（主人反馈 hover 重复登场特效烦） */
      trigger: options.trigger || 'mount',
      fontSize: options.fontSize || 'clamp(52px, 8vw, 104px)',
      /* 800：更粗字形 → 粒子采样覆盖更完整，笔画不"散"（原 700 衬线横画细、粒子断） */
      fontWeight: options.fontWeight != null ? options.fontWeight : 800,
      fontFamily: options.fontFamily || 'inherit',
      glow: options.glow !== false
    };

    var particles = [];
    var animationFrame = null;
    var resizeFrame = null;
    var buildId = 0;
    var gathering = false;
    var gatherStart = 0;
    var width = 0;
    var height = 0;
    var dpr = 1;

    var pointer = { active: false, x: 0, y: 0, smoothX: 0, smoothY: 0 };

    var startGather = function (fromScatter) {
      if (!particles.length) return;

      var now = performance.now();
      /* 散开半径受容器限制：超出会被 overflow:hidden 裁掉，粒子"闪现消失"（bug） */
      var spread = Math.min(cfg.scatter, Math.min(width, height) * 0.45);

      particles.forEach(function (particle) {
        if (fromScatter) {
          var angle = particle.seed * Math.PI * 2;
          var distance = spread * (0.35 + particle.depth * 0.75);
          particle.x = particle.targetX + Math.cos(angle) * distance + (particle.depth - 0.5) * spread * 0.55;
          particle.y = particle.targetY + Math.sin(angle) * distance + (particle.seed - 0.5) * spread * 0.55;
        }

        particle.startX = particle.x;
        particle.startY = particle.y;
        particle.delay = particle.seed * cfg.stagger;
      });

      gatherStart = now;
      gathering = true;
    };

    var drawParticle = function (particle) {
      var size = particle.size;
      ctx.fillStyle = particle.color;
      /* glow 用粒子自身颜色（自发光）：深色粒子不泛光、accent 点缀粒子发光，
         避免整字被 accent 光晕染蓝（全局 shadowColor 会全字泛蓝） */
      if (cfg.glow) {
        ctx.shadowBlur = cfg.particleSize * 2;
        ctx.shadowColor = particle.color;
      } else {
        ctx.shadowBlur = 0;
      }

      if (size <= 2.1) {
        ctx.fillRect(particle.x - size / 2, particle.y - size / 2, size, size);
        return;
      }

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, size / 2, 0, Math.PI * 2);
      ctx.fill();
    };

    var render = function (now) {
      ctx.clearRect(0, 0, width, height);

      pointer.smoothX += (pointer.x - pointer.smoothX) * 0.18;
      pointer.smoothY += (pointer.y - pointer.smoothY) * 0.18;

      var complete = true;

      particles.forEach(function (particle) {
        var baseX = particle.targetX;
        var baseY = particle.targetY;
        var progress = 1;

        if (gathering) {
          var local = (now - gatherStart - particle.delay) / Math.max(1, cfg.gatherDuration);
          progress = clamp(local, 0, 1);
          var eased = easeOutCubic(progress);
          baseX = particle.startX + (particle.targetX - particle.startX) * eased;
          baseY = particle.startY + (particle.targetY - particle.startY) * eased;
          if (progress < 1) complete = false;
        } else if (cfg.idleDrift > 0) {
          var driftTime = now * 0.001;
          baseX += Math.sin(driftTime * 0.9 + particle.seed * 10) * cfg.idleDrift * particle.depth;
          baseY += Math.cos(driftTime * 0.75 + particle.depth * 10) * cfg.idleDrift * particle.depth;
        }

        if (pointer.active && cfg.pointerRepel > 0 && cfg.repelRadius > 0) {
          var dx = baseX - pointer.smoothX;
          var dy = baseY - pointer.smoothY;
          var distance = Math.hypot(dx, dy);
          if (distance > 0 && distance < cfg.repelRadius) {
            var force = Math.pow(1 - distance / cfg.repelRadius, 2) * cfg.pointerRepel;
            baseX += (dx / distance) * force;
            baseY += (dy / distance) * force;
          }
        }

        var follow = 0.22;
        particle.x += (baseX - particle.x) * follow;
        particle.y += (baseY - particle.y) * follow;

        ctx.globalAlpha = clamp(0.35 + progress * 0.65, 0, 1);
        drawParticle(particle);
      });

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      if (gathering && complete) {
        gathering = false;
      }

      animationFrame = window.requestAnimationFrame(render);
    };

    var ensureRenderLoop = function () {
      if (animationFrame === null) {
        animationFrame = window.requestAnimationFrame(render);
      }
    };

    var sampleText = async function () {
      var currentBuild = ++buildId;
      var rect = container.getBoundingClientRect();
      width = Math.floor(rect.width);
      height = Math.floor(rect.height);

      if (width <= 0 || height <= 0) return;

      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      /* 颜色随主题实时解析（refresh 时重采样）。
         粒子主色 = accent（主人要求不用黑色 ink）；点缀色 = accent 混白 35%（浅蓝层次） */
      var baseHex = resolveCssColor(cfg.colorVar, '#2563eb');
      cfg.color = baseHex;
      cfg.highlightColor = mixHex(baseHex, '#ffffff', 0.35);

      var computed = window.getComputedStyle(container);
      var resolvedFamily = cfg.fontFamily === 'inherit' ? (computed.fontFamily || 'sans-serif') : cfg.fontFamily;
      var resolvedSize = resolveFontSize(cfg.fontSize, container, cfg.fontWeight, resolvedFamily);
      var font = cfg.fontWeight + ' ' + resolvedSize + 'px ' + resolvedFamily;

      await waitForFonts(font);
      if (currentBuild !== buildId) return;

      var offscreen = document.createElement('canvas');
      var offCtx = offscreen.getContext('2d', { willReadFrequently: true });
      if (!offCtx) return;

      var content = String(cfg.text || ' ');
      var maxTextWidth = width * 0.92;
      offCtx.font = font;
      var metrics = offCtx.measureText(content);
      var measuredWidth = Math.max(1, metrics.width);
      if (measuredWidth > maxTextWidth) {
        resolvedSize = Math.max(18, resolvedSize * (maxTextWidth / measuredWidth));
        font = cfg.fontWeight + ' ' + resolvedSize + 'px ' + resolvedFamily;
        await waitForFonts(font);
        if (currentBuild !== buildId) return;
        offCtx.font = font;
        metrics = offCtx.measureText(content);
      }

      var left = Math.ceil(metrics.actualBoundingBoxLeft || 0);
      var right = Math.ceil(metrics.actualBoundingBoxRight || metrics.width);
      var ascent = Math.ceil(metrics.actualBoundingBoxAscent || resolvedSize * 0.78);
      var descent = Math.ceil(metrics.actualBoundingBoxDescent || resolvedSize * 0.22);
      var padding = Math.max(12, Math.ceil(resolvedSize * 0.08));
      var textWidth = Math.max(1, left + right);
      var textHeight = Math.max(1, ascent + descent);

      offscreen.width = textWidth + padding * 2;
      offscreen.height = textHeight + padding * 2;
      offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
      offCtx.font = font;
      offCtx.textAlign = 'left';
      offCtx.textBaseline = 'alphabetic';
      offCtx.fillStyle = '#ffffff';
      offCtx.fillText(content, padding - left, padding + ascent);

      var imageData = offCtx.getImageData(0, 0, offscreen.width, offscreen.height);
      var targets = [];
      var step = Math.max(2, Math.floor(cfg.density));

      for (var y = 0; y < offscreen.height; y += step) {
        for (var x = 0; x < offscreen.width; x += step) {
          var alpha = imageData.data[(y * offscreen.width + x) * 4 + 3];
          if (alpha > 40) {
            targets.push({
              x: width / 2 - offscreen.width / 2 + x,
              y: height / 2 - offscreen.height / 2 + y,
              alpha: alpha / 255
            });
          }
        }
      }

      /* 粒子预算：/80 → 桌面 ~1250 粒子（v7 的 /60 ~1400 太密，回退到主人满意的 v4 档） */
      var maxParticles = Math.max(1000, Math.min(6500, Math.floor((width * height) / 80)));
      var stride = Math.max(1, Math.ceil(targets.length / maxParticles));
      var baseRgb = hexToRgb(cfg.color);
      var highlightRgb = hexToRgb(cfg.highlightColor);
      var selected = targets.filter(function (_, index) { return index % stride === 0; });

      particles = selected.map(function (target, index) {
        var seed = ((index * 9301 + 49297) % 233280) / 233280;
        var depth = 0.45 + (((index * 233 + 97) % 1000) / 1000) * 0.9;
        /* 混色：accent 为主（主人要求不用黑），seed 抖动 0~0.5 → 部分粒子向浅蓝点缀 */
        var blend = baseRgb && highlightRgb ? clamp((seed - 0.5) * 0.6 + 0.2, 0, 1) : 0;
        var particleColor = baseRgb && highlightRgb ? rgbToCss(mixRgb(baseRgb, highlightRgb, blend)) : cfg.color;
        /* 初始散开半径同样受容器限制（防溢出被裁） */
        var scatterR = Math.min(cfg.scatter, Math.min(width, height) * 0.45);
        var angle = seed * Math.PI * 2;
        var distance = scatterR * (0.35 + depth * 0.75);
        var startX = target.x + Math.cos(angle) * distance + (seed - 0.5) * scatterR * 0.45;
        var startY = target.y + Math.sin(angle) * distance + (depth - 0.9) * scatterR * 0.45;

        return {
          x: startX,
          y: startY,
          startX: startX,
          startY: startY,
          targetX: target.x,
          targetY: target.y,
          /* 粒子大小随笔画深浅变化更平缓（0.85~1.15）：笔画内部大小均匀，
             避免原系数（0.75~1.2）中心粗边缘细显得"花" */
          size: Math.max(0.6, cfg.particleSize * (0.85 + target.alpha * 0.3)),
          color: particleColor,
          seed: seed,
          depth: depth,
          delay: seed * cfg.stagger
        };
      });

      pointer.x = width / 2;
      pointer.y = height / 2;
      pointer.smoothX = pointer.x;
      pointer.smoothY = pointer.y;

      startGather(false);
      ensureRenderLoop();
    };

    var queueSample = function () {
      if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(sampleText);
    };

    var handlePointerMove = function (event) {
      var rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
    };

    var handlePointerLeave = function () {
      pointer.active = false;
    };

    var handlePointerEnter = function (event) {
      handlePointerMove(event);
      if (cfg.trigger === 'hover') startGather(true);
    };

    var handleClick = function () {
      if (cfg.trigger === 'click') startGather(true);
    };

    canvas.addEventListener('pointerenter', handlePointerEnter);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerleave', handlePointerLeave);
    canvas.addEventListener('click', handleClick);

    var resizeObserver = new ResizeObserver(queueSample);
    resizeObserver.observe(container);
    sampleText();

    var instance = {
      container: container,
      canvas: canvas,
      refresh: sampleText,
      destroy: function () {
        buildId += 1;
        resizeObserver.disconnect();
        canvas.removeEventListener('pointerenter', handlePointerEnter);
        canvas.removeEventListener('pointermove', handlePointerMove);
        canvas.removeEventListener('pointerleave', handlePointerLeave);
        canvas.removeEventListener('click', handleClick);
        if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
        if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
        var idx = instances.indexOf(instance);
        if (idx >= 0) instances.splice(idx, 1);
        if (container.__particleTextInstance === instance) delete container.__particleTextInstance;
      }
    };

    container.__particleTextInstance = instance;
    instances.push(instance);
    return instance;
  }

  window.RainParticleText = {
    init: initParticleText,
    refresh: function () {
      instances.forEach(function (inst) { inst.refresh(); });
    },
    instances: instances
  };

  /* 自动初始化所有 [data-particle-text] 容器（脚本位于 </body> 前，DOM 已就绪） */
  function initAll() {
    var containers = document.querySelectorAll('[data-particle-text]');
    containers.forEach(function (el) {
      window.RainParticleText.init(el);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
