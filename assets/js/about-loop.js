/* about-loop.js — Skills logo loop 双向引擎（2026-08-20）
   参考 React Bits <LogoLoop /> 的核心逻辑转译成原生 JS：
   - rAF 循环 + 速度平滑插值（SMOOTH_TAU = 0.25，hover 减速/恢复无跳变）
   - 动态复制份数：复制到覆盖容器宽 + 2 份 headroom（无缝循环）
   - hover 时 target = data-hover 速度（默认 0 = 暂停）
   - 方向：data-direction="left" 右→左 / "right" 左→右（与 React Bits 一致）
   - 主题切换不干预（CSS 变量走 --color-*，无 JS 联动）
   用法：<div class="skills-loop" data-direction="left" data-speed="120" data-hover="24">
           <div class="skills-loop-viewport"><div class="skills-loop-track"><ul class="skills-loop-list">…</ul></div></div>
         </div>
   注意：复制份数只增不删（克隆便宜，防 resize 抖动）；首份是可见序列，其余 aria-hidden。 */
(function () {
  var TAU = 0.25;          /* 速度平滑时间常数（秒） */
  var HEADROOM = 2;        /* 额外复制份数缓冲 */

  var loops = document.querySelectorAll('.skills-loop');
  if (!loops.length) return;

  /* 2026-08-20 主人"上下两个 loop 卡片大小一样 + 宽一点点"：全局统一测宽。
     遍历所有 loop 的 chip 取全局最大宽 + 8px 缓冲，写到每个 loop 的 --chip-w →
     工具/语言两 loop 全部等宽，克隆自动继承。字体加载 / resize 后重测。 */
  function setAllChipWidth() {
    var max = 0;
    for (var i = 0; i < loops.length; i++) {
      var first = loops[i].querySelector('.skills-loop-list');
      if (!first) continue;
      var chips = first.querySelectorAll('.skills-chip');
      for (var j = 0; j < chips.length; j++) {
        var w = chips[j].getBoundingClientRect().width;
        if (w > max) max = w;
      }
    }
    var w = Math.ceil(max) + 4; /* 全局统一 + 4px 缓冲（2026-08-20 主人"显得有点长"=横向：8→4 收紧） */
    for (var k = 0; k < loops.length; k++) {
      loops[k].style.setProperty('--chip-w', w + 'px');
    }
  }

  function initLoop(root) {
    var viewport = root.querySelector('.skills-loop-viewport');
    var track = root.querySelector('.skills-loop-track');
    var first = root.querySelector('.skills-loop-list');
    if (!viewport || !track || !first) return;

    var speed = parseFloat(root.dataset.speed) || 120;
    var hover = parseFloat(root.dataset.hover);
    var dirMul = root.dataset.direction === 'right' ? -1 : 1;
    var targetVelocity = Math.abs(speed) * dirMul;
    var hovered = false;
    var velocity = 0;
    var offset = 0;
    var last = null;
    var raf = null;

    /* 同步复制份数：覆盖视口 + headroom；只增不删（防 resize 抖动）
       所有克隆与首份同源，克隆失败/节点丢失时重新补 */
    function syncCopies() {
      var listW = first.getBoundingClientRect().width || 1;
      var need = Math.max(2, Math.ceil(viewport.clientWidth / listW) + HEADROOM);
      while (track.children.length < need) {
        var clone = first.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        track.appendChild(clone);
      }
    }

    function frame(ts) {
      if (last === null) last = ts;
      var dt = Math.max(0, (ts - last) / 1000);
      last = ts;
      var target = hovered && hover !== undefined ? hover * dirMul : targetVelocity;
      var ease = 1 - Math.exp(-dt / TAU);
      velocity += (target - velocity) * ease;
      offset += velocity * dt;
      var seqW = first.getBoundingClientRect().width;
      if (seqW > 0) offset = ((offset % seqW) + seqW) % seqW;
      track.style.transform = 'translate3d(' + (-offset) + 'px, 0, 0)';
      raf = requestAnimationFrame(frame);
    }

    root.addEventListener('mouseenter', function () {
      if (hover !== undefined) hovered = true;
    });
    root.addEventListener('mouseleave', function () {
      hovered = false;
    });
    /* 触摸设备：tap 暂停（pointer coarse 时 hover 不触发），点一下停、再点走 */
    if (window.matchMedia('(pointer: coarse)').matches) {
      root.addEventListener('click', function () {
        hovered = !hovered;
      });
    }

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        setAllChipWidth();
        syncCopies();
        last = null;
      }, 120);
    });

    setAllChipWidth();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        setAllChipWidth();
        syncCopies();
        last = null;
      });
    }
    syncCopies();
    raf = requestAnimationFrame(frame);
  }

  for (var i = 0; i < loops.length; i++) {
    initLoop(loops[i]);
  }
})();
