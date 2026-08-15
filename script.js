    var navEl = document.getElementById('nav');
    var btn = document.getElementById('hamburgerBtn');
    var menu = document.getElementById('navMenu');
    var closeBtn = document.getElementById('navMenuClose');
    var body = document.body;
    var themeToggle = document.getElementById('themeToggle');
    var themeToggleDesktop = document.getElementById('themeToggleDesktop');
    var themeLabelDesktop = document.getElementById('themeLabelDesktop');
    var themeLabelMobile = document.getElementById('themeLabelMobile');
    var metaTheme = document.querySelector('meta[name="theme-color"]');
    /* 从 head 同步过来的 theme-dark class 读出当前主题，供 toggleTheme 翻转 */
    var isDark = document.documentElement.classList.contains('theme-dark');

    function applyTheme(dark, persist) {
      isDark = dark;
      document.documentElement.classList.toggle('theme-dark', dark);
      var label = dark ? 'Light' : 'Dark';
      if (themeLabelDesktop) themeLabelDesktop.textContent = label;
      if (themeLabelMobile) themeLabelMobile.textContent = label;
      if (metaTheme) metaTheme.setAttribute('content', dark ? '#0f172a' : '#f8fafc');
      /* 背景动效跟随主题 accent 色：粒子网络（canvas-nest）+ 几何飘带（canvas-ribbons） */
      var accent = null;
      try { accent = getComputedStyle(document.documentElement).getPropertyValue('--color-accent-rgb').trim(); } catch (e) {}
      if (accent) {
        var rgb = accent.replace(/\s+/g, '');
        if (window.RainNest) { window.RainNest.setColor(rgb); }
        if (window.RainRibbons) { window.RainRibbons.setColor(rgb); }
      }
      if (persist !== false) {
        try { localStorage.setItem('rainmeow-theme', dark ? 'dark' : 'light'); } catch (e) {}
      }
    }
    function toggleTheme() {
      applyTheme(!isDark);
    }

    var mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    if (mq && mq.addEventListener) {
      mq.addEventListener('change', function (e) {
        var saved = null;
        try { saved = localStorage.getItem('rainmeow-theme'); } catch (err) {}
        if (!saved) { applyTheme(e.matches, false); }
      });
    }

    themeToggle.addEventListener('click', toggleTheme);
    if (themeToggleDesktop) themeToggleDesktop.addEventListener('click', toggleTheme);
    function openMenu() {
      btn.classList.add('open');
      menu.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      menu.setAttribute('aria-hidden', 'false');
      /* 锁 body 滚动：抽屉用 transform 覆盖，但 body scroll 仍能进行——加 class 锁住 */
      document.body.classList.add('nav-open');
      body.style.overflow = 'hidden';
      /* 焦点移入菜单首个可聚焦元素（关闭按钮） */
      var firstFocusable = menu.querySelector('a[href], button:not([disabled])');
      if (firstFocusable) { firstFocusable.focus(); }
    }
    function closeMenu() {
      btn.classList.remove('open');
      menu.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-hidden', 'true');
      /* 解锁 body 滚动 */
      document.body.classList.remove('nav-open');
      body.style.overflow = '';
      /* 焦点还给汉堡按钮 */
      btn.focus();
    }

    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (menu.classList.contains('open')) { closeMenu(); }
      else { openMenu(); }
    });
    closeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      closeMenu();
    });
    menu.addEventListener('click', function(e) {
      if (e.target.tagName === 'A') { closeMenu(); }
    });
    /* Tab 焦点锁定在菜单内循环（打开状态下） */
    menu.addEventListener('keydown', function(e) {
      if (e.key !== 'Tab' || !menu.classList.contains('open')) return;
      var focusables = menu.querySelectorAll('a[href], button:not([disabled])');
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && menu.classList.contains('open')) {
        closeMenu();
      }
    });
    /* === 桌面导航滑动高亮 === */
    (function () {
      var navLinks = document.querySelector('.nav-links');
      var indicator = document.querySelector('.nav-hover-indicator');
      if (!navLinks || !indicator) return;
      var links = navLinks.querySelectorAll('a');
      var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reducedMotion) indicator.style.transition = 'none';

      function moveTo(link) {
        var navRect = navLinks.getBoundingClientRect();
        var linkRect = link.getBoundingClientRect();
        indicator.style.width = linkRect.width + 'px';
        indicator.style.transform = 'translateX(' + (linkRect.left - navRect.left) + 'px)';
        indicator.style.opacity = '1';
      }

      links.forEach(function (link) {
        link.addEventListener('mouseenter', function () { moveTo(link); });
        /* 键盘 Tab 聚焦时同样驱动光斑，与鼠标体验统一 */
        link.addEventListener('focus', function () { moveTo(link); });
      });
      navLinks.addEventListener('mouseleave', function () {
        indicator.style.opacity = '0';
      });
      /* 窗口尺寸变化时校正指示器位置（鼠标仍悬停在链接上时） */
      var resizeTicking = false;
      window.addEventListener('resize', function () {
        if (resizeTicking) return;
        resizeTicking = true;
        requestAnimationFrame(function () {
          resizeTicking = false;
          var hovered = navLinks.querySelector('a:hover');
          if (hovered) moveTo(hovered);
        });
      });
    })();
    /* === 桌面右侧操作区滑动高亮（月亮/地球，与目录同款） === */
    (function () {
      var actions = document.querySelector('.nav-actions');
      var indicator = document.querySelector('.nav-actions-indicator');
      if (!actions || !indicator) return;
      var buttons = actions.querySelectorAll('.nav-icon');
      var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reducedMotion) indicator.style.transition = 'none';

      function moveTo(btn) {
        var actionsRect = actions.getBoundingClientRect();
        var btnRect = btn.getBoundingClientRect();
        indicator.style.width = btnRect.width + 'px';
        indicator.style.transform = 'translateX(' + (btnRect.left - actionsRect.left) + 'px)';
        indicator.style.opacity = '1';
      }

      buttons.forEach(function (btn) {
        btn.addEventListener('mouseenter', function () { moveTo(btn); });
        /* 键盘 Tab 聚焦时同样驱动光斑 */
        btn.addEventListener('focus', function () { moveTo(btn); });
      });
      actions.addEventListener('mouseleave', function () {
        indicator.style.opacity = '0';
      });
      /* 窗口尺寸变化时校正指示器位置（鼠标仍悬停在按钮上时） */
      var resizeTicking = false;
      window.addEventListener('resize', function () {
        if (resizeTicking) return;
        resizeTicking = true;
        requestAnimationFrame(function () {
          resizeTicking = false;
          var hovered = actions.querySelector('.nav-icon:hover');
          if (hovered) moveTo(hovered);
        });
      });
    })();
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function() {
        if (window.scrollY > 8) { navEl.classList.add('scrolled'); }
        else { navEl.classList.remove('scrolled'); }
        ticking = false;
      });
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    /* === Hero 区：入场动画 + 打字机 + 时钟 + 天气 ===
       注意：不做 prefers-reduced-motion 降级（主人系统开「减弱动态效果」，
       写了会被 Safari/Chrome 静默关掉，动画就"坏"了） */
    (function () {
      var hero = document.getElementById('hero');
      if (!hero) return;
      requestAnimationFrame(function () {
        hero.classList.add('entered');
      });

      /* --- 打字机：几句雨猫主题句子循环播放 --- */
      var typeEl = document.getElementById('typewriter');
      if (typeEl) {
        var LINES = [
          '时雨时猫，雨落，码落。',
          '把淋湿的灵感，写成可运行的代码。',
          '在雨里敲键盘，声音刚好。',
          '收集每一次失败里学到的语法。'
        ];
        var TYPE_MS = 90;        // 打字间隔
        var DELETE_MS = 42;      // 删除间隔
        var PAUSE_AFTER = 4000;  // 打完整句停顿（主人要求间隔增加）
        var PAUSE_BEFORE = 800;  // 删完到下一句停顿
        var li = 0, ci = 0, deleting = false, timer = null;

        function tick() {
          var line = LINES[li];
          if (!deleting) {
            ci += 1;
            typeEl.textContent = line.slice(0, ci);
            if (ci >= line.length) {
              deleting = true;
              timer = setTimeout(tick, PAUSE_AFTER);
              return;
            }
            timer = setTimeout(tick, TYPE_MS);
          } else {
            ci -= 1;
            typeEl.textContent = line.slice(0, ci);
            if (ci <= 0) {
              deleting = false;
              li = (li + 1) % LINES.length;
              timer = setTimeout(tick, PAUSE_BEFORE);
              return;
            }
            timer = setTimeout(tick, DELETE_MS);
          }
        }
        timer = setTimeout(tick, 700);
      }

      /* --- 时钟：时间 + 日期 + 安安问候（本地实时） --- */
      var timeEl = document.getElementById('heroTime');
      var dateEl = document.getElementById('heroDate');
      var greetEl = document.getElementById('heroGreet');
      if (timeEl && dateEl) {
        var timeFmt = new Intl.DateTimeFormat('zh-HK', {
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        });
        var dateFmt = new Intl.DateTimeFormat('zh-HK', {
          year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
        });
        /* 安安问候按时段变化，句子长一点、带关心 */
        function greetFor(hour) {
          if (hour >= 5 && hour < 11) return '早安呀，新的一天，慢慢来。';
          if (hour >= 11 && hour < 13) return '午安呀，记得好好吃饭。';
          if (hour >= 13 && hour < 18) return '下午好呀，累了就歇一歇。';
          if (hour >= 18 && hour < 23) return '晚上好呀，今天也辛苦了。';
          return '夜深了，早点休息，照顾好自己。';
        }
        function tickClock() {
          var now = new Date();
          timeEl.textContent = timeFmt.format(now);
          dateEl.textContent = dateFmt.format(now);
          if (greetEl) greetEl.textContent = greetFor(now.getHours());
        }
        tickClock();
        setInterval(tickClock, 1000);
      }

      /* --- 天气：open-meteo 免费 API（香港 · 科大坐标），失败降级为 "--" --- */
      var weatherEl = document.getElementById('heroWeather');
      if (weatherEl) {
        var CODES = {
          0: '晴', 1: '晴间多云', 2: '多云', 3: '阴',
          45: '雾', 48: '雾凇',
          51: '毛毛雨', 53: '毛毛雨', 55: '毛毛雨',
          61: '小雨', 63: '中雨', 65: '大雨',
          71: '小雪', 73: '中雪', 75: '大雪',
          80: '阵雨', 81: '阵雨', 82: '强阵雨',
          95: '雷阵雨', 96: '雷雨', 99: '雷雨'
        };
        var ctrl = new AbortController();
        var guard = setTimeout(function () { ctrl.abort(); }, 6000);
        fetch('https://api.open-meteo.com/v1/forecast?latitude=22.337&longitude=114.263&current=temperature_2m,weather_code', {
          signal: ctrl.signal
        })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            clearTimeout(guard);
            var cur = d && d.current;
            if (!cur) { weatherEl.textContent = '天气 --'; return; }
            var label = CODES[cur.weather_code] || '天气';
            weatherEl.textContent = label + ' ' + Math.round(cur.temperature_2m) + '°';
          })
          .catch(function () {
            clearTimeout(guard);
            weatherEl.textContent = '天气 --';
          });
      }

      /* --- 照片按压反馈（mousedown 压扁 / mouseup 弹簧回弹）：
         按下：60ms 快速压扁 scale(0.97) 并保持（fill: forwards）；
         松开：单帧回弹 + back 缓动曲线（cubic-bezier(0.34,1.56,0.64,1)）——
         过冲由曲线自身产生（y>1 的 overshoot），不手写关键帧（逐帧反而卡顿不自然）。
         规范依据：gesture-responses —— press 50ms 内响应、release 150-300ms + overshoot。
         拖出元素（mouseleave）等同松开；touch 用 touchstart/touchend 等价。
         位移/缩放读 --lift/--scale 变量（hover 提供），保持 hover 态一致 */
      var artCard = document.querySelector('.hero-art-card');
      if (artCard) {
        var pressAnim = null;
        var releaseAnim = null;
        var pressed = false;
        function readVar(name, fallback) {
          var v = getComputedStyle(artCard).getPropertyValue(name).trim();
          return v || fallback;
        }
        function tfAt(scaleVal) {
          var lift = readVar('--lift', '0px');
          return 'rotate(-2deg) translateY(' + lift + ') scale(' + scaleVal + ')';
        }
        function tfBase() {
          return tfAt(readVar('--scale', '1'));
        }
        function pressDown(e) {
          /* 只响应左键（button=0）：右键/中键会弹系统菜单，压扁动画会与菜单错乱。
             touch 事件无 button 属性（undefined），短路跳过检查正常触发 */
          if (e && e.button !== undefined && e.button !== 0) return;
          if (pressed) return;
          pressed = true;
          if (releaseAnim) { releaseAnim.cancel(); releaseAnim = null; }
          pressAnim = artCard.animate([
            { transform: tfBase(), offset: 0 },
            { transform: tfAt(0.97), offset: 1 }
          ], { duration: 60, easing: 'ease-out', fill: 'forwards' });
        }
        function releaseUp() {
          if (!pressed) return;
          pressed = false;
          if (pressAnim) { pressAnim.cancel(); pressAnim = null; }
          /* 两帧 + back 缓动：过冲（1.03 量级）由曲线生成，手写关键帧反而显僵硬 */
          releaseAnim = artCard.animate([
            { transform: tfAt(0.97), offset: 0 },
            { transform: tfBase(), offset: 1 }
          ], { duration: 280, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
          releaseAnim.onfinish = function () { releaseAnim = null; };
        }
        artCard.addEventListener('mousedown', pressDown);
        window.addEventListener('mouseup', releaseUp);
        artCard.addEventListener('mouseleave', releaseUp);
        artCard.addEventListener('touchstart', pressDown, { passive: true });
        artCard.addEventListener('touchend', releaseUp, { passive: true });
        artCard.addEventListener('touchcancel', releaseUp, { passive: true });
      }
    })();
