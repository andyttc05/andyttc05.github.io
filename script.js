    var navEl = document.getElementById('nav');
    var btn = document.getElementById('hamburgerBtn');
    var menu = document.getElementById('navMenu');
    var closeBtn = document.getElementById('navMenuClose');
    var body = document.body;
    var themeToggle = document.getElementById('themeToggle');
    var themeToggleDesktop = document.getElementById('themeToggleDesktop');
    var themeLabelDesktop = document.getElementById('themeLabelDesktop');
    var themeLabelMobile = document.getElementById('themeLabelMobile');
    var isDark = false;
    var metaTheme = document.querySelector('meta[name="theme-color"]');

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
    var activeVt = null;
    var rmQuery = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    var prefersReducedMotion = !!(rmQuery && rmQuery.matches);
    if (rmQuery && rmQuery.addEventListener) {
      rmQuery.addEventListener('change', function (e) { prefersReducedMotion = e.matches; });
    }
    function startThemeTransition(next, x, y) {
      document.documentElement.style.setProperty('--vt-x', x + 'px');
      document.documentElement.style.setProperty('--vt-y', y + 'px');
      var vt = document.startViewTransition(function () { applyTheme(next); });
      activeVt = vt;
      if (vt.finished) {
        vt.finished.catch(function () {}).then(function () {
          if (activeVt === vt) { activeVt = null; }
        });
      }
    }
    var vtRestartPending = null;
    var vtRestartScheduled = false;
    function toggleTheme(e) {
      var next = !isDark;
      if (document.startViewTransition && !prefersReducedMotion) {
        if (activeVt) {
          /* 动画进行中再次点击：跳过当前动画，下一帧从新点击位置启动新动画接续。
             不立即重启——旧过渡清理未完时新过渡会排队，期间点击会被浏览器吞掉；
             rAF 合并连点，保证每次点击都响应、动画平滑接续不跳变 */
          activeVt.skipTransition();
          activeVt = null;
          vtRestartPending = {
            next: next,
            x: (e && e.clientX != null) ? e.clientX : window.innerWidth / 2,
            y: (e && e.clientY != null) ? e.clientY : window.innerHeight / 2
          };
          if (!vtRestartScheduled) {
            vtRestartScheduled = true;
            requestAnimationFrame(function () {
              vtRestartScheduled = false;
              if (vtRestartPending) {
                var p = vtRestartPending;
                vtRestartPending = null;
                startThemeTransition(p.next, p.x, p.y);
              }
            });
          }
          return;
        }
        var x = (e && e.clientX != null) ? e.clientX : window.innerWidth / 2;
        var y = (e && e.clientY != null) ? e.clientY : window.innerHeight / 2;
        startThemeTransition(next, x, y);
      } else {
        applyTheme(next);
      }
    }
    /* 过渡进行期间，浏览器会把整页的 hit-testing 跳过（root 参与快照所致），
       落在主题按钮上的点击会丢失（target 变成 <html>）。
       这里在 capture 阶段监听 + 坐标命中检测，把点击接管回来，保证连点跟手 */
    document.addEventListener('click', function (e) {
      if (!activeVt) return;
      var targets = [themeToggleDesktop, themeToggle];
      for (var i = 0; i < targets.length; i++) {
        var t = targets[i];
        if (!t) continue;
        /* 命中检测用实际热区（.nav-menu-action-hit，若存在），与缩小后的可点击范围一致 */
        var hitEl = t.querySelector ? t.querySelector('.nav-menu-action-hit') : null;
        var r = (hitEl || t).getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right &&
            e.clientY >= r.top && e.clientY <= r.bottom) {
          var reachedButton = e.target === t || t.contains(e.target);
          if (!reachedButton) { toggleTheme(e); }
          return;
        }
      }
    }, true);

    (function initTheme() {
      var dark = document.documentElement.classList.contains('theme-dark');
      isDark = dark;
      var label = dark ? 'Light' : 'Dark';
      if (themeLabelDesktop) themeLabelDesktop.textContent = label;
      if (themeLabelMobile) themeLabelMobile.textContent = label;
      if (metaTheme) metaTheme.setAttribute('content', dark ? '#0f172a' : '#f8fafc');
    })();

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
