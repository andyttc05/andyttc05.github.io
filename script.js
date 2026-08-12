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
