/* 项目页 · Skewed Carousel（第一百八十批 2026-08-25 主人"用 skewed 动画展示项目"）——
   原生实现 React Bits Pro Skewed Carousel 同款效果（站点零第三方依赖）：
   - 卡片条横向排开，活动卡居中正对；每远离活动卡一档绕 Y 轴旋转 60° + 缩放 0.85，
     非活动卡标题 blur(2px)，容器 perspective 800px 消失点深度。
   - transform 由本文件逐卡写入（offset 驱动），CSS transition 平滑。
   - 交互：左右按钮 / 底部圆点 / pointer 拖拽 / 键盘 ←→。
   数据：PROJECTS 数组（占位，主人后续替换为真实项目）。 */
(function () {
  var root = document.getElementById('skewedCarousel');
  if (!root) return;
  var strip = root.querySelector('.skewed-strip');
  var prevBtn = root.querySelector('.skewed-arrow.prev');
  var nextBtn = root.querySelector('.skewed-arrow.next');
  var dotsWrap = root.querySelector('.skewed-dots');

  /* === 项目数据（占位 —— 主人替换为真实项目；每条：no/title/desc） === */
  var PROJECTS = [
    { no: '01', title: '猫窝工坊', desc: '这个网站本身，听雨写码的小窝' },
    { no: '02', title: '项目二', desc: '待补充描述' },
    { no: '03', title: '项目三', desc: '待补充描述' },
    { no: '04', title: '项目四', desc: '待补充描述' },
    { no: '05', title: '项目五', desc: '待补充描述' },
    { no: '06', title: '项目六', desc: '待补充描述' }
  ];

  var index = 0;
  var cards = [];
  var W = 200, G = 28, ROT = 30; /* 卡片宽/间距/每档旋转角（读 CSS 变量，resize 重算） */

  function measure() {
    var cs = getComputedStyle(root);
    W = parseFloat(cs.getPropertyValue('--sc-card-w')) || 200;
    G = parseFloat(cs.getPropertyValue('--sc-gap')) || 28;
    ROT = parseFloat(cs.getPropertyValue('--sc-rot')) || 30;
  }

  function render() {
    strip.innerHTML = '';
    dotsWrap.innerHTML = '';
    cards = [];
    PROJECTS.forEach(function (p, i) {
      var card = document.createElement('article');
      card.className = 'skewed-card';
      card.innerHTML =
        '<div class="skewed-card-inner">' +
          '<span class="skewed-card-no">' + p.no + '</span>' +
          '<h3 class="skewed-card-title">' + p.title + '</h3>' +
          '<p class="skewed-card-desc">' + p.desc + '</p>' +
        '</div>';
      strip.appendChild(card);
      cards.push(card);

      var dot = document.createElement('button');
      dot.className = 'skewed-dot';
      dot.setAttribute('aria-label', '第 ' + (i + 1) + ' 个项目');
      dot.addEventListener('click', function () { go(i); });
      dotsWrap.appendChild(dot);
    });
    update();
  }

  function update() {
    measure();
    for (var i = 0; i < cards.length; i++) {
      var off = i - index;
      var x = off * (W + G);
      var rot = -off * ROT; /* 左卡 +ROT°（右缘朝前）/ 右卡 -ROT° —— 消失点纵深 */
      var sc = off === 0 ? 1 : 0.85;
      /* 第一百八十一批（主人"左右内容渐入渐出"）：非活动卡随 |off| 渐隐
         （off=0→1 / ±1→0.55 / ±2→0.3 / ±3→0.17），配合容器 overflow 裁剪 */
      var op = off === 0 ? 1 : Math.pow(0.55, Math.abs(off));
      cards[i].style.transform =
        'translateX(' + x + 'px) rotateY(' + rot + 'deg) scale(' + sc + ')';
      cards[i].style.opacity = op.toFixed(2);
      cards[i].classList.toggle('is-active', off === 0);
    }
    var dots = dotsWrap.querySelectorAll('.skewed-dot');
    for (var d = 0; d < dots.length; d++) {
      dots[d].classList.toggle('is-active', d === index);
    }
    /* 非循环：首/尾禁用方向（视觉降透明） */
    if (prevBtn) prevBtn.style.opacity = index === 0 ? 0.35 : 1;
    if (nextBtn) nextBtn.style.opacity = index === cards.length - 1 ? 0.35 : 1;
  }

  function go(i) {
    if (i < 0 || i >= cards.length || i === index) return;
    index = i;
    update();
  }
  function next() { go(index + 1); }
  function prev() { go(index - 1); }

  if (prevBtn) prevBtn.addEventListener('click', prev);
  if (nextBtn) nextBtn.addEventListener('click', next);

  /* 键盘 ←/→（轮播聚焦时） */
  root.tabIndex = 0;
  root.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
  });

  /* 拖拽（pointer events，横向；拖动超 50px 松手触发翻页）。
     监听在 strip（卡片条）上 —— 若挂在根容器并 setPointerCapture，
     pointer capture 会把按钮的 click 重定向到根容器，箭头按钮失效。 */
  var dragX = null, dragged = false;
  strip.addEventListener('pointerdown', function (e) {
    dragX = e.clientX;
    dragged = false;
    if (strip.setPointerCapture) strip.setPointerCapture(e.pointerId);
  });
  strip.addEventListener('pointermove', function (e) {
    if (dragX === null) return;
    if (Math.abs(e.clientX - dragX) > 8) dragged = true;
    if (dragged) {
      for (var i = 0; i < cards.length; i++) cards[i].classList.add('is-dragging');
    }
  });
  function endDrag(e) {
    if (dragX === null) return;
    var dx = e.clientX - dragX;
    for (var i = 0; i < cards.length; i++) cards[i].classList.remove('is-dragging');
    if (dragged && Math.abs(dx) > 50) {
      if (dx < 0) next(); else prev();
    }
    dragX = null;
    dragged = false;
  }
  strip.addEventListener('pointerup', endDrag);
  strip.addEventListener('pointercancel', endDrag);

  /* resize（媒体查询改卡片宽/间距）→ 重算 transform */
  var rTimer = null;
  window.addEventListener('resize', function () {
    if (rTimer) return;
    rTimer = setTimeout(function () { rTimer = null; update(); }, 150);
  });

  render();
})();
