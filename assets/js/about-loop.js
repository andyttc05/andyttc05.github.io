/* about-loop.js — Skills logo loop 双向引擎（2026-08-20 / 第一百二十三批 2026-08-21 加拖拽拉动）
   参考 React Bits <LogoLoop /> 的核心逻辑转译成原生 JS：
   - rAF 循环 + 速度平滑插值（SMOOTH_TAU = 0.25，hover 减速/恢复无跳变）
   - 动态复制份数：复制到覆盖容器宽 + 2 份 headroom（无缝循环）
   - hover 时 target = data-hover 速度（默认 0 = 暂停）
   - 拖拽拉动（第一百二十三批 主人"循环卡片支持拖拽拉动"）：
       pointerdown 暂停自动滚动 → pointermove 轨道实时跟随指针（右拉内容右移，
       循环取模保持无缝）→ pointerup 按释放前速度给惯性初速，TAU 平滑衰减回自动速度。
       触摸端 touch-action: pan-y 纵向滚动页面不受影响；拖动 >5px 抑制该次 click
       （避免与 tap 暂停逻辑冲突）。
       ⚠️ 2026-09-23：setPointerCapture 从 pointerdown 挪到「位移 > DRAG_CAPTURE_PX」——
       原地按一下（无 pointermove）不再抓指针，否则 WebKit 松手后不重算 :hover、
       chip 上浮永久熄火（详见 pointermove 里那段注释）。
   - 方向：data-direction="left" 右→左 / "right" 左→右（与 React Bits 一致）
   - 主题切换不干预（CSS 变量走 --color-*，无 JS 联动）
   用法：<div class="skills-loop" data-direction="left" data-speed="120" data-hover="24">
            <div class="skills-loop-viewport"><div class="skills-loop-track"><ul class="skills-loop-list">…</ul></div></div>
          </div>
   注意：复制份数只增不删（克隆便宜，防 resize 抖动）；首份是可见序列，其余 aria-hidden。 */
(function () {
  var TAU = 0.25;          /* 速度平滑时间常数（秒） */
  var HEADROOM = 2;        /* 额外复制份数缓冲 */
  var DRAG_VMAX = 800;     /* 拖拽释放惯性速度上限（px/s），防甩飞 */
  var DRAG_CAPTURE_PX = 3; /* 越过多少像素才 setPointerCapture（见 pointermove 注释） */

  var loops = document.querySelectorAll('.skills-loop');
  if (!loops.length) return;

  /* 2026-08-20 主人"上下两个 loop 卡片大小一样 + 宽一点点"：全局统一测宽。
     遍历所有 loop 的 chip 取全局最大宽 + 8px 缓冲，写到每个 loop 的 --chip-w →
     工具/语言两 loop 全部等宽，克隆自动继承。字体加载 / resize 后重测。
     第一百三十一批（2026-08-21 主人"移动端滚动到技能区卡片瞬移"）：
     测宽改用 offsetWidth（布局宽度）——原 getBoundingClientRect().width 受
     卡片滚动驱动 scale 动画（scroll-fade-move 0.96→1）影响：移动端滚动/
     地址栏收起导致视口高度变化 → scale 变化 → 测宽漂移 → --chip-w 横跳 →
     chip 宽度跳变 + track offset 取模跳变 = 视觉瞬移。offsetWidth 不含
     transform，任何视口/滚动位置下测值稳定。 */
  function setAllChipWidth() {
    var max = 0;
    for (var i = 0; i < loops.length; i++) {
      var first = loops[i].querySelector('.skills-loop-list');
      if (!first) continue;
      var chips = first.querySelectorAll('.skills-chip');
      for (var j = 0; j < chips.length; j++) {
        var w = chips[j].offsetWidth; /* 布局宽，不受滚动 scale 动画影响 */
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

    /* === 拖拽拉动状态（第一百二十三批） === */
    var dragging = false;
    var dragStartX = 0;
    var dragStartOffset = 0;
    var dragLastX = 0;
    var dragLastT = 0;
    var dragVel = 0;      /* 释放前瞬时速度（px/s）→ 松手惯性初速 */

    /* === 松手那一刻就复原上浮（2026-09-23 第三百一十批） ===
       症状（主人）：按住 chip 再松开，卡片**要等鼠标移动才上浮**，不丝滑。
       根因：真实鼠标按一下几乎总会抖 3px 以上 ⇒ 越过 DRAG_CAPTURE_PX 抓了指针，
       而 WebKit **在 pointer capture 释放后不重算 :hover 链** ⇒ 松手瞬间 :hover 仍 false，
       卡片躺在静止位，直到下一次鼠标移动才重算（`jitter.js` 实测：抖 0/2px 正常，
       抖 4/8px 复现；Chromium 松手会重算，所以只在 WebKit 露头）。
       修法：不等引擎 —— 松手时用 elementFromPoint 自己判「指针还在不在这枚 chip 上」，
       是就给 chip 挂 `.is-hover`（与 :hover 同款上浮，见 style.css），指针一动再交还原生 :hover。
       ⚠️ 只对鼠标/触控笔做：触摸端不该有"上浮"（style.css 里 hover:none 那条只关 :hover）。 */
    var jsHoverChip = null;   /* 松手时由命中测试挂上 .is-hover 的那枚 chip */
    function hitAt(x, y) {
      if (x == null || y == null) return { overRoot: false, chip: null };
      var el = document.elementFromPoint(x, y);
      if (!el) return { overRoot: false, chip: null };
      var chip = el.closest ? el.closest('.skills-chip') : null;
      return { overRoot: root.contains(el), chip: chip && root.contains(chip) ? chip : null };
    }
    function setJsHover(chip) {
      if (chip === jsHoverChip) return;
      if (jsHoverChip) jsHoverChip.classList.remove('is-hover');
      jsHoverChip = chip || null;
      if (jsHoverChip) jsHoverChip.classList.add('is-hover');
    }

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
      if (dragging) {
        /* 第一百二十五批：拖拽/长按期间立即停住 —— 原实现只把 target 改为 0，
           靠 TAU 平滑衰减 velocity，从全速(55px/s)降到 0 需约 1s，
           长按前几百 ms 仍能看到明显位移（"长按不暂停"）。
           pointermove 会直接写 offset，拖拽期间 velocity 恒 0 即可完全停住；
           松手惯性由 endDrag 按释放前移动速度另设，不受这里影响。 */
        velocity = 0;
      } else {
        var target = hovered && hover !== undefined ? hover * dirMul : targetVelocity;
        var ease = 1 - Math.exp(-dt / TAU);
        velocity += (target - velocity) * ease;
      }
      offset += velocity * dt;
      /* 第一百三十一批：seqW 改用 offsetWidth（布局宽）——原 getBoundingClientRect
         受卡片滚动 scale 动画影响，滚动/视口变化时 seqW 漂移 → offset 取模结果跳变
         → track 瞬移。布局宽在滚动全程稳定。 */
      var seqW = first.offsetWidth;
      if (seqW > 0) offset = ((offset % seqW) + seqW) % seqW;
      track.style.transform = 'translate3d(' + (-offset) + 'px, 0, 0)';
      raf = requestAnimationFrame(frame);
    }

    /* 第一百三十四批（2026-08-21 主人"移动端点击卡片动画速度异常减慢"）：
       hover 减速只绑定 hover 设备 —— 移动端点击会触发浏览器合成的 mouseenter
       （触摸点击 = 合成鼠标事件序列：mouseover/mouseenter → mousedown → click），
       导致 hovered=true 触发减速到 data-hover(12px/s)，且触摸没有 mouseleave
       → 动画永久慢速（正是"点击后动画变慢"的根因）。
       触摸设备无真实 hover，不绑定 hover 减速；原 tap 暂停（click 切换 hovered）
       一并移除 —— 移动端点击不影响动画速度，暂停/拉动由拖拽（pointerdown）提供。 */
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      root.addEventListener('mouseenter', function () {
        if (hover !== undefined) hovered = true;
      });
      root.addEventListener('mouseleave', function () {
        hovered = false;
        setJsHover(null);   /* 指针离开整条 loop：松手补的上浮也一起撤 */
      });
    }

    /* === 拖拽拉动（第一百二十三批 2026-08-21 主人"循环卡片支持拖拽拉动"） ===
       pointerdown：暂停自动滚动并记录起点；pointermove：offset 实时跟随指针
       （右拉 dx>0 → 内容右移 → offset 减小；与 data-direction 无关，直接操纵视觉），
       循环取模保持无缝；pointerup：释放惯性初速 = -拖拽速度（clamp ±DRAG_VMAX），
       frame() 的 TAU 平滑自然衰减回自动滚动速度。 */
    root.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return; /* 仅左键拖拽 */
      dragging = true;
      dragStartX = e.clientX;
      dragStartOffset = offset;
      dragLastX = e.clientX;
      dragLastT = performance.now();
      dragVel = 0;
      hovered = false;                 /* 拖拽期间完全停（含 hover 减速） */
      setJsHover(null);                /* 按下即落回静止位（:active 接手），清掉松手补的那枚 */
      e.preventDefault();
    });
    root.addEventListener('pointermove', function (e) {
      if (!dragging) {
        /* 松手时补的 .is-hover（见 endDrag）：指针一动就核一次当前位置 ——
           仍在某枚 chip 上就保持（换到隔壁一枚就跟着搬），离开 chip 才撤。
           ⚠️ 判据是"指针底下有没有 chip"，**不是"还是不是同一枚节点"** ——
           轨道里同一张卡有克隆件（aria-hidden），滑 1px 就可能命中另一枚节点，
           按节点身份比会把刚补上的上浮立刻误撤（jitter.js 实测：抖 4/8px 时移动
           1px 就掉回 ty=0）。 */
        if (jsHoverChip) setJsHover(hitAt(e.clientX, e.clientY).chip);
        return;
      }
      var dx = e.clientX - dragStartX;
      /* 2026-09-23（主人"按住 chip → 取消上浮落回原位；松开 → 恢复上浮"）：
         原来在 pointerdown 就 setPointerCapture，现改为**越过 3px 才抓**。
         根因：WebKit 在 pointer capture 释放后不重算 :hover 链 —— 指针原地按一下
         （没有任何 pointermove）也会被抓、松手后 hover 恒为 false，chip 的上浮
         永久熄灭到下次鼠标移动；Chromium 松手会重算，所以只在 WebKit 露头
          （HEAD 干树 A/B 实测：capture=off 时 WebKit 与 Chromium 表现一致）。
         3px 阈值对拖拽零影响：真要拖出卡片，位移早就远大于 3px，
         setPointerCapture 仍会在离开卡片之前完成（第一百三十批的"拖出后松开
         仍跟随"修复不受影响），window 级 pointerup 兜底也原样保留。
         ⚠️ 但 3px 只挡得住"完全不动"的点击 —— 真实鼠标按一下常抖 4~8px，照样抓指针
         ⇒ 真正的兜底是松手时的命中测试（hitAt/setJsHover，第三百一十批），
         别把这条阈值当成"WebKit hover 问题的解"。 */
      if (Math.abs(dx) > DRAG_CAPTURE_PX && !root.hasPointerCapture(e.pointerId)) {
        root.setPointerCapture(e.pointerId);
      }
      var now = performance.now();
      var dt = Math.max(1, now - dragLastT) / 1000;
      dragVel = (e.clientX - dragLastX) / dt;
      dragLastX = e.clientX;
      dragLastT = now;
      var seqW = first.getBoundingClientRect().width;
      offset = dragStartOffset - dx;
      if (seqW > 0) offset = ((offset % seqW) + seqW) % seqW;
    });
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      var v = -dragVel; /* offset 变化率 = -拖拽速度 */
      if (v > DRAG_VMAX) v = DRAG_VMAX;
      if (v < -DRAG_VMAX) v = -DRAG_VMAX;
      velocity = v;
      /* 鼠标释放：指针仍在 loop 上 → 恢复 hover 减速；已拖出 loop（兜底场景）
         → 恢复全速；触摸：无 hover。
         ⚠️ 判据用命中测试，不用 root.matches(':hover') —— WebKit 在 capture 释放后
         :hover 恒 false（见 endDrag 上方注释），用它会让减速也一起延迟到下次鼠标移动。 */
      var h = hitAt(e.clientX, e.clientY);
      hovered = e.pointerType !== 'touch' && h.overRoot && hover !== undefined;
      setJsHover(e.pointerType === 'touch' ? null : h.chip);
      if (root.hasPointerCapture(e.pointerId)) root.releasePointerCapture(e.pointerId);
    }
    /* 无事件对象可用的强制结束（blur/visibilitychange 兜底）：
       没有松手速度可参考 → 惯性置 0 直接停，hover 按指针实际位置恢复 */
    function forceEndDrag() {
      if (!dragging) return;
      dragging = false;
      velocity = 0;
      hovered = hover !== undefined && root.matches(':hover');
      setJsHover(null);
    }
    root.addEventListener('pointerup', endDrag);
    root.addEventListener('pointercancel', endDrag);
    /* 第一百三十批（2026-08-21 主人"拖出卡片区域后松开，卡片仍跟随鼠标"）：
       根因 = 拖拽结束只监听 root 的 pointerup/pointercancel，依赖 setPointerCapture
       把松手事件重定向回 root —— 但指针拖出 loop 后松开时，capture 失效/未重定向的
       场景下 root 收不到 pointerup，dragging 卡死为 true，之后鼠标任何移动
       （包括 loop 外）都会继续驱动卡片。
       修复 ①：window 级补监听 pointerup/pointercancel —— 指针在 loop 外但页面内
       松开时兜底结束拖拽。endDrag 幂等（dragging 已 false 时直接返回），
       root 与 window 双监听不冲突；指针在 loop 外松开时 hovered 按 matches(':hover')
       判 false，自动滚动恢复全速。
       修复 ②：window blur / visibilitychange 兜底 —— 指针拖出浏览器窗口后松手时，
       页面收不到任何 pointerup/pointercancel（事件序列中断），dragging 会一直卡着；
       失焦/切后台时强制结束拖拽（forceEndDrag 无惯性直接停）。 */
    window.addEventListener('pointerup', function (e) { if (dragging) endDrag(e); });
    window.addEventListener('pointercancel', function (e) { if (dragging) endDrag(e); });
    window.addEventListener('blur', forceEndDrag);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) forceEndDrag();
    });

    var resizeTimer = null;
    var lastViewW = window.innerWidth;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        /* 第一百三十一批：只在视口宽度变化时重测/重排 —— 移动端滚动时地址栏
           收起/展开只改高度（innerWidth 不变），若照旧重测会无谓触发 chip 宽度
           重排与复制数调整，造成卡片瞬移（测宽已改用 offsetWidth 不受 scale 影响） */
        var w = window.innerWidth;
        if (w !== lastViewW) {
          setAllChipWidth();
          syncCopies();
          last = null;
        }
        lastViewW = w;
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
