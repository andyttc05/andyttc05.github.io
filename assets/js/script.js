    /* 第一百三十七批（2026-08-21 主人"移除 Lenis 平滑滚动库，改用原生滚动 + 自行优化"）：
       Lenis 平滑滚动已移除（lenis.min.js 引入同步删除）——桌面/移动端统一原生滚动。
       原生滚动本身带系统惯性（macOS/iOS 触摸板/触摸），移动端天然流畅；
       过渡带（落眸笑歌触五字目录）的丝滑跟随由下方自研 lerp 承担（原 lenisOn 让位
       分支已移除，始终走自研帧率无关 + 速度自适应平滑）。
       第一百六十二批：滚动停止后的自动吸附回弹已整体移除（主人"我不喜欢有反弹"），
       滚动随惯性自然停止，不再弹回任何位置。 */

    /* 第一百三十八批（2026-08-21 主人"优化一下滑动效果"）：
       桌面滚轮平滑（轻量自研，弥补 Lenis 移除后鼠标滚轮逐格跳动的质感损失）——
       拦截 wheel（passive:false + preventDefault）→ 目标位置累加 → rAF lerp 逼近 →
       window.scrollTo 逐帧落地。只对"鼠标滚轮/触摸板"（hover:hover + pointer:fine）
       启用，触摸设备保持原生滚动（原生已流畅）。
       第一百三十九批（主人"感觉有时不是很跟手"）：固定 LERP 0.13 在快速滚动时
       current 追不上 target → 滞后明显。改为速度自适应：滚动距离大（快滚/追远）
       → k 大更跟手（上限 0.6，距离 ≥1200px 饱和）；距离小 → k 小平滑收尾。
       任意程序化滚动（抽屉关后滚顶）前调用 window.__wheelPause()
       取消进行中的 wheel 插值，避免两套滚动打架。 */
    (function () {
      var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      if (!fine) return;
      var target = null, raf = null;
      /* 第一百五十批（2026-08-23 主人"优化网页滑动手感"）：
         对照主流平滑滚动标准（Lenis 手感模型 / 惯性阻尼惯例）重构：
         ① 帧率无关：旧版用固定 lerp 系数 k（0.2-0.6），60Hz/120Hz 或掉帧时
            每帧走固定比例 → 滚动速度随设备/负载漂移。改为指数平滑
            k = 1 - exp(-dt/TAU)，按帧间隔归一化（与过渡带/vslide 的
            lerp 同一套数学，站内手感统一）。
         ② 双通道自适应：距离通道（目标远 → 跟手）+ 速度通道（慢速微调
            近乎直通、中速滚轮平滑防逐格跳、快速跟手），消除旧版
            30px"直通/插值"硬切换的手感断层。
         ③ 程序化滚动协调：抽屉关后滚顶前调用 __wheelPause() 停掉 wheel 平滑
            （target 清空），程序化滚动结束后 wheel 重新从实际位置锚定，
            不会"滚完又跳回旧目标"。 */
      var TAU_MIN = 0.04, TAU_MAX = 0.14;   /* 平滑时间常数：跟手 40ms / 平顺 140ms */
      var DIST_SAT = 900;                   /* 距离饱和（px）：≥ 用 TAU_MIN（最跟手） */
      var VEL_MID = 40;                     /* 输入速度"中值"（px/事件）：最平滑档 */
      var VEL_MID_TAU = 0.14;               /* 中速输入的 TAU（最平滑，防滚轮逐格跳） */
      var MIN_STEP = 0.3;                   /* 到位判定阈值（px） */
      var lastInputV = 0;                   /* 最近一次 wheel 输入速度（px/事件） */
      var lastT = 0;
      function maxScroll() {
        return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      }
      function frame(now) {
        if (target === null) { raf = null; return; }
        var dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 1 / 60;
        lastT = now;
        var cur = window.scrollY;
        var delta = target - cur;
        var ad = Math.abs(delta);
        /* 双通道平滑（帧率无关指数平滑），取更跟手的一方：
           ① 距离通道：目标远 → 小 TAU 跟手，目标近 → 大 TAU 平顺收尾；
           ② 速度通道：慢速微调（触摸板细调）→ 小 TAU 近乎直通不滞后；
              中速滚轮 → 大 TAU 平滑（消除逐格跳）；快速 → 小 TAU 跟手。 */
        var tDist = TAU_MIN + (TAU_MAX - TAU_MIN) * Math.max(0, 1 - ad / DIST_SAT);
        var v = lastInputV;
        var tVel;
        if (v < VEL_MID) {
          /* 慢速：速度越低越跟手（0 → TAU_MIN 直通） */
          tVel = TAU_MIN + (VEL_MID_TAU - TAU_MIN) * (v / VEL_MID);
        } else if (v < VEL_MID * 2) {
          /* 中速：最平滑（滚轮逐格 → 平滑过渡） */
          tVel = VEL_MID_TAU;
        } else {
          /* 快速：越快越跟手（双倍中值以上快速回落 TAU_MIN） */
          tVel = VEL_MID_TAU - (VEL_MID_TAU - TAU_MIN) * Math.min(1, (v - VEL_MID * 2) / (VEL_MID * 2));
        }
        var tau = Math.min(tDist, tVel);
        var kd = 1 - Math.exp(-dt / tau);
        var next = cur + delta * kd;
        if (ad < MIN_STEP) {
          next = target;
          target = null;
          raf = null;
        } else {
          raf = requestAnimationFrame(frame);
        }
        window.scrollTo(0, next);
      }
      window.addEventListener('wheel', function (e) {
        if (!e.deltaY) return;
        e.preventDefault();
        var delta = e.deltaY;
        var max = maxScroll();
        if (target === null) {
          target = window.scrollY;
          lastT = 0;
          raf = requestAnimationFrame(frame);
        }
        lastInputV = Math.abs(delta);
        target = Math.max(0, Math.min(max, target + delta));
      }, { passive: false });
      window.__wheelPause = function () {
        target = null;
        if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
      };
    })();

    /* 第一百四十三批（2026-08-22 主人"连续刷新页面时图片会闪了一下"）：
       图片加载完成前保持透明（CSS .hero-art-img / .vslide-img 初始 opacity:0），
       load 后加 .is-loaded 触发 0.5s 淡入 —— 图片晚到（CDN 慢 / 开发者工具
       禁缓存）时不再"卡片先亮、图片啪地弹出"；已缓存图在脚本执行时即 complete，
       立即加类，入场动画期间完成淡入，观感与原来一致。
       第一百四十八批（2026-08-23 主人"刷新页面时落眸笑歌触五幕雨区域会卡住或消失"）：
       原实现只挂 load 监听，存在两类失效：
       (a) loading="lazy" 的 vslide 图滚动前不加载 → 无 load 事件 → 永远 opacity:0；
       (b) 图片加载失败（404/断网）→ load 不触发 → 区域永远空白。
       修法（三路兜底，任一路成功即点亮）：
       1. complete 立即点亮（缓存命中）；
       2. load 监听（正常加载）；
       3. error 监听 —— 失败也点亮（显示纸底，绝不让区域永久消失）；
       4. IntersectionObserver —— lazy 图进入视口即确保开始加载，
          刷新恢复滚动位置时视口内的图也会被主动触发（无需用户滚动）。 */
    function markImageLoaded(img) {
      if (!img) return;
      function on() { img.classList.add('is-loaded'); }
      /* 已加载（含缓存命中）直接点亮 */
      if (img.complete && img.naturalWidth > 0) { on(); return; }
      /* 正常加载 → 点亮；加载失败 → 也点亮（宁可见纸底，不可区域永久空白） */
      img.addEventListener('load', on, { once: true });
      img.addEventListener('error', on, { once: true });
      /* lazy 图兜底：进入视口即开始加载（lazy 本身会加载，这里保证
         刷新恢复滚动位置时视口内的图不依赖用户滚动才触发） */
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
          for (var i = 0; i < entries.length; i++) {
            if (entries[i].isIntersecting) {
              var t = entries[i].target;
              io.unobserve(t);
              if (t.complete && t.naturalWidth > 0) on();
              /* 未 complete 时 load/error 监听兜底已挂，无需额外动作 */
            }
          }
        }, { rootMargin: '200px' });
        io.observe(img);
      }
    }

    var navEl = document.getElementById('nav');
    var scrollProgressEl = document.getElementById('scrollProgress');
    var btn = document.getElementById('hamburgerBtn');
    var menu = document.getElementById('navMenu');
    var closeBtn = document.getElementById('navMenuClose');
    var navMenuBrand = document.getElementById('navMenuBrand');
    var body = document.body;

    /* === hero 视频已移除（v62：2026-08-17 晚，移动端卡顿回退为静态图）===
       之前 v61 的 poster-first lazy video IIFE 在此位置（48 行代码）已删除。
       视频文件也已在 v62 一并从仓库清出（macOS 回收站可恢复）。 */
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
      var accent = getComputedStyle(document.documentElement).getPropertyValue('--color-accent-rgb').trim();
      var rgb = accent.replace(/\s+/g, '');
      window.RainNest && window.RainNest.setColor(rgb);
      window.RainRibbons && window.RainRibbons.setColor(rgb);
      /* hero 标题颜色走 CSS 变量 --color-accent，主题切换自动变色，无需 JS 联动 */
      if (persist !== false) {
        localStorage.setItem('rainmeow-theme', dark ? 'dark' : 'light');
      }
    }
    function toggleTheme() {
      applyTheme(!isDark);
    }

    /* 现代浏览器 matchMedia.addEventListener 是标准 API(Safari 14+ / Chrome 39+) */
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      if (!localStorage.getItem('rainmeow-theme')) { applyTheme(e.matches, false); }
    });

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
    /* 第一百零九批：手机版抽屉 rain.meow 可点击 —— 行为：
       其他页 → 链接跳转回首页（href=index.html / ../index.html 已写在 HTML）；
       首页 → 拦截默认导航，只关抽屉并滚回顶部，避免整页刷新 */
    if (navMenuBrand) {
      navMenuBrand.addEventListener('click', function(e) {
        /* 已经在首页就阻止跳转 → 只关抽屉 + 滚回顶 */
        var path = location.pathname;
        var onHome = path === '/' || path.endsWith('/index.html') || path === '/index.html';
        if (onHome) {
          e.preventDefault();
          closeMenu();
          /* 第一百三十八批：滚顶前取消 wheel 平滑插值（避免程序化滚动被插值拉回） */
          if (window.__wheelPause) window.__wheelPause();
          window.scrollTo({ top: 0, behavior: 'smooth' }); /* 第一百三十七批：Lenis 移除，恒原生平滑 */
        }
        /* 其他页：让 href 正常跳转；menu 上的 A-click handler 会顺带关抽屉 */
      });
    }
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
      /* 首次定位一律 snap（无过渡）：光斑初始态在导航最左端 translateX(0)/width 0，
         若首次定位直接带过渡，会看到"从左滑入"——第一个链接（项目）恰好在 0 位
         所以看不出，其余链接（动态/照片/关于）就会明显滑入。刷新后浏览器会对
         光标下的链接补发 mouseenter，同样触发首次定位。首次 snap 到位后，
         链接之间的移动再走平滑过渡（滑动高亮设计不变）。 */
      var shown = false;

      function moveTo(link) {
        var navRect = navLinks.getBoundingClientRect();
        var linkRect = link.getBoundingClientRect();
        indicator.style.width = linkRect.width + 'px';
        indicator.style.transform = 'translateX(' + (linkRect.left - navRect.left) + 'px)';
        indicator.style.opacity = '1';
      }
      /* 无过渡直接定位：先关 transition → 设样式 → 强制 reflow 落定 → 恢复 transition */
      function snapTo(link) {
        var prev = indicator.style.transition;
        indicator.style.transition = 'none';
        moveTo(link);
        void indicator.offsetWidth;
        indicator.style.transition = prev;
      }
      function position(link) {
        if (shown) moveTo(link);
        else { shown = true; snapTo(link); }
      }

      links.forEach(function (link) {
        link.addEventListener('mouseenter', function () { position(link); });
        /* 键盘 Tab 聚焦时同样驱动光斑，与鼠标体验统一 */
        link.addEventListener('focus', function () { position(link); });
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
          if (hovered) position(hovered);
        });
      });
      /* 加载完成兜底：若悬停/焦点已被恢复（如刷新后鼠标仍停在链接上且浏览器
         未补发 mouseenter），立即 snap 到位并标记已定位 */
      var restored = document.activeElement;
      if (restored && restored.tagName === 'A' && navLinks.contains(restored)) {
        shown = true;
        snapTo(restored);
      } else {
        var hovered = navLinks.querySelector('a:hover');
        if (hovered) { shown = true; snapTo(hovered); }
      }
    })();
    /* === 桌面右侧操作区滑动高亮（月亮/地球，与目录同款） === */
    (function () {
      var actions = document.querySelector('.nav-actions');
      var indicator = document.querySelector('.nav-actions-indicator');
      if (!actions || !indicator) return;
      var buttons = actions.querySelectorAll('.nav-icon');
      /* 与目录同款：首次定位一律 snap，避免光斑从 translateX(0) 滑入
         （第一个按钮 Dark 恰好在 0 位看不出，EN 就会从左滑入） */
      var shown = false;

      function moveTo(btn) {
        var actionsRect = actions.getBoundingClientRect();
        var btnRect = btn.getBoundingClientRect();
        indicator.style.width = btnRect.width + 'px';
        indicator.style.transform = 'translateX(' + (btnRect.left - actionsRect.left) + 'px)';
        indicator.style.opacity = '1';
      }
      /* 无过渡直接定位：先关 transition → 设样式 → 强制 reflow 落定 → 恢复 transition */
      function snapTo(btn) {
        var prev = indicator.style.transition;
        indicator.style.transition = 'none';
        moveTo(btn);
        void indicator.offsetWidth;
        indicator.style.transition = prev;
      }
      function position(btn) {
        if (shown) moveTo(btn);
        else { shown = true; snapTo(btn); }
      }

      buttons.forEach(function (btn) {
        btn.addEventListener('mouseenter', function () { position(btn); });
        /* 键盘 Tab 聚焦时同样驱动光斑 */
        btn.addEventListener('focus', function () { position(btn); });
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
          if (hovered) position(hovered);
        });
      });
      /* 加载完成兜底：若悬停/焦点已被恢复，立即 snap 到位并标记已定位 */
      var restored = document.activeElement;
      if (restored && restored.classList.contains('nav-icon') && actions.contains(restored)) {
        shown = true;
        snapTo(restored);
      } else {
        var hovered = actions.querySelector('.nav-icon:hover');
        if (hovered) { shown = true; snapTo(hovered); }
      }
    })();
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function() {
        if (window.scrollY > 8) { navEl.classList.add('scrolled'); }
        else { navEl.classList.remove('scrolled'); }
        /* 顶部滑动进度条：scaleX(0→1)，分母 = 可滚动总高度（文档高 - 视口高） */
        if (scrollProgressEl) {
          var max = document.documentElement.scrollHeight - window.innerHeight;
          var p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
          scrollProgressEl.style.transform = 'scaleX(' + p + ')';
        }
        ticking = false;
      });
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    /* 视口高度变化（svh/地址栏）会改可滚动总高度 → resize 时重算进度 */
    window.addEventListener('resize', onScroll, { passive: true });

    /* === Hero 区：入场动画 + 打字机 + 时钟 + 天气 ===
       注意：不做 prefers-reduced-motion 降级（主人系统开「减弱动态效果」，
       写了会被 Safari/Chrome 静默关掉，动画就"坏"了） */
    (function () {
      var hero = document.getElementById('hero');
      if (!hero) return;
      /* 第一百四十五批（2026-08-22 主人"加个加载页过渡，资源加载完再显示页面"）：
         hero 入场从「脚本就绪立即播」改为「页面就绪（加载页结束）后播」——
         loader.js 在 window load + 字体就绪后给 <html> 加 .page-ready 并派发 pageReady
         事件；这里等它就位再 .entered，让加载页淡出与 hero 弹入无缝衔接。
         兜底：pageReady 未触发（loader 脚本缺失/异常）时 window load + 1s 强制入场，
         页面永不因加载页而不可见。 */
      function heroEnter() {
        /* 入场被加载页推迟 → 锚点抑制窗口重新从入场时刻计时 1.3s（第一百四十二批） */
        suppressUntil = Math.max(suppressUntil || 0, performance.now() + 1300);
        requestAnimationFrame(function () {
          hero.classList.add('entered');
        });
        startTypewriter();
      }
      if (document.documentElement.classList.contains('page-ready')) {
        heroEnter();
      } else {
        document.addEventListener('pageReady', heroEnter, { once: true });
        window.addEventListener('load', function () {
          setTimeout(heroEnter, 1000);
        }, { once: true });
      }

      /* --- hero 布局锚点（第六十批）：图片垂直居中 + 第三层跟图片底部对齐 ---
         图片在 hero 内容区垂直居中（.hero-art align-self: center）→ 图片底部 =
         (内容区高 + 图片高) / 2。hero-text 是 stretch 占满内容区，layer-3 margin-top:auto
         会落到 hero-text 内容盒底部 = 内容区底部 → 比图片底部多出 (内容区高-图片高)/2。
         修正：把 (内容区高-图片高)/2 写成 --hero-anchor 作 hero-text 的 padding-bottom，
         layer-3 的落点被抬到图片底部，精准对齐。
         移动端（≤768px）：单列流式，hero-text 非 stretch → 锚点置 0，间距交给 CSS margin。
         resize 重算（图片宽高随列宽变）；用 rAF 防抖 + 首帧字体加载后再补一次 */
      var heroText = hero.querySelector('.hero-text');
      var artCard = hero.querySelector('.hero-art-card');
      var mqMobile = window.matchMedia('(max-width: 768px)');
      var anchorTicking = false;
      /* 第一百四十二批（2026-08-22 主人"连续刷新后 SCROLL 动画结束时定位偶发不一致"）：
         入场动画期间（≤1.2s）任何 --hero-anchor 重算都会触发 .hero 高度 reflow →
         .hero-scroll（bottom 32px 锚定 .hero 内容盒底部）瞬时跳变；用户感知为
         "动画刚结束位置却飘了一下"。suppressUntil = now() + 1300ms（hero.entered
         0.45s delay + 0.7s 时长 ≈ 1.15s 落定 + 100ms 余量）。所有 syncHeroAnchor 调用
         (初始 / fonts.ready / img.load / resize) 在此期间都 no-op；期间 --hero-anchor
         保持 0，hero-text 默认 padding-bottom=0（layout 与最初 CSS 一致，SCROLL
         位置稳定）；跨过 1.3s 后第一次 resize / fonts.ready 回调 / img.load 才会回填
         —— 此时 hero 入场已落定，reflow 不再影响视觉锚点。 */
      var suppressUntil = performance.now() + 1300;
      function syncHeroAnchor() {
        if (anchorTicking) return;
        if (performance.now() < suppressUntil) return;
        anchorTicking = true;
        requestAnimationFrame(function () {
          var anchor = 0;
          if (!mqMobile.matches && heroText && artCard) {
            /* 内容区高 = hero-text clientHeight（stretch 撑满）减去它自身的 padding；
               offsetHeight 含 border，用 clientHeight 保持一致 */
            var contentH = heroText.clientHeight - (parseFloat(getComputedStyle(heroText).paddingBottom) || 0);
            var imgH = artCard.clientHeight;
            anchor = Math.max(0, Math.round((contentH - imgH) / 2));
          }
          hero.style.setProperty('--hero-anchor', anchor + 'px');
          anchorTicking = false;
        });
      }
      window.addEventListener('resize', syncHeroAnchor);
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(syncHeroAnchor);
      }
      /* 图片加载完成（intrinsic 尺寸确定）后再校一次，防 aspect-ratio 计算误差。
         但 inline preload + 已缓存图经常在 50ms 内就 complete，过早 sync 会和入场撞车
         —— 所以这里不再立即 sync；fonts.ready + resize 兜底即可（同一资源栈里
         img.complete 触发时 fonts 也已 ready，至少一个会落 1.3s 后回调，触发回填） */
      if (artCard) {
        var img = artCard.querySelector('img');
        if (img && !img.complete) {
          img.addEventListener('load', syncHeroAnchor, { once: true });
        }
        /* 第一百四十三批：图片就绪前透明 → 就绪后淡入（防晚到图片弹出闪现） */
        markImageLoaded(img);
      }

      /* --- 打字机：几句雨猫主题句子循环播放 ---
         暂停/恢复接口（stopTypewriter/startTypewriter）：hero 滚出视口时停掉 setTimeout 链
         （DOM 不再每 90ms 重排），滚回时从当前 ci/li 接着打（保留播放进度）。
         pause 时清掉排队中的 timer、状态变量不动 → resume 时 tick() 自然续接 */
      var typeEl = document.getElementById('typewriter');
      var typeTimer = null;
      if (typeEl) {
        var LINES = [
          '时雨时猫，雨落，码落。',
          '把淋湿的灵感，写成可运行的代码。',
          '雨滴划过玻璃，灵感在代码里成型。',
          '代码如诗，一写就是整个世界。',
          '从零到一，每一步都算数。'
        ];
        var TYPE_MS = 90;        // 打字间隔
        var DELETE_MS = 42;      // 删除间隔
        var PAUSE_AFTER = 4000;  // 打完整句停顿（主人要求间隔增加）
        var PAUSE_BEFORE = 800;  // 删完到下一句停顿
        var li = 0, ci = 0, deleting = false;

        function tick() {
          var line = LINES[li];
          if (!deleting) {
            ci += 1;
            typeEl.textContent = line.slice(0, ci);
            if (ci >= line.length) {
              deleting = true;
              typeTimer = setTimeout(tick, PAUSE_AFTER);
              return;
            }
            typeTimer = setTimeout(tick, TYPE_MS);
          } else {
            ci -= 1;
            typeEl.textContent = line.slice(0, ci);
            if (ci <= 0) {
              deleting = false;
              li = (li + 1) % LINES.length;
              typeTimer = setTimeout(tick, PAUSE_BEFORE);
              return;
            }
            typeTimer = setTimeout(tick, DELETE_MS);
          }
        }
        typeTimer = null;
        /* 第一百四十五批（加载页）：打字机初始启动等页面就绪 ——
           加载页盖住期间不空转，加载页淡出后才从第一句开打。
           就绪路径：heroEnter() 里的 startTypewriter()（200ms）会接棒；
           这里只负责兜底 —— page-ready 已就绪 / pageReady 事件 / load+1s 强制，
           保证任何时序下打字机都会启动且不重复（typeTimer 判空）。 */
        if (document.documentElement.classList.contains('page-ready')) {
          typeTimer = setTimeout(tick, 700);
        } else {
          document.addEventListener('pageReady', function () {
            if (!typeTimer) typeTimer = setTimeout(tick, 700);
          }, { once: true });
          window.addEventListener('load', function () {
            setTimeout(function () {
              if (!typeTimer) typeTimer = setTimeout(tick, 700);
            }, 1000);
          }, { once: true });
        }
      }
      function stopTypewriter() {
        if (typeTimer) { clearTimeout(typeTimer); typeTimer = null; }
      }
      function startTypewriter() {
        /* 第一百四十五批：加载页未结束（无 .page-ready）不启动打字机 ——
           IO 在页面加载时立即 intersect hero 会触发这里，门控后改为等 pageReady 再开打 */
        if (!document.documentElement.classList.contains('page-ready')) return;
        if (!typeEl || typeTimer) return;
        typeTimer = setTimeout(tick, 200);
      }

      /* --- 时钟：时间 + 日期 + 安安问候（本地实时）
         中文页面（html lang 以 zh 开头）一律用中文日期时间格式（24h 制），
         非中文页面才跟随设备语言；时区始终用设备本地时间
         暂停/恢复接口（stopClock/startClock）：hero 滚出视口时停掉 setInterval
         （DOM 不再每秒重排 + Intl 格式化 + greet 字符串运算），滚回时立即刷一次并恢复计时 */
      var timeEl = document.getElementById('heroTime');
      var dateEl = document.getElementById('heroDate');
      var greetEl = document.getElementById('heroGreet');
      var clockTimer = null;
      var tickClock = null;
      if (timeEl && dateEl) {
        var isZh = (document.documentElement.lang || '').toLowerCase().indexOf('zh') === 0;
        var fmtLang = isZh ? 'zh-HK' : (navigator.language || 'zh-HK');
        var timeFmt = new Intl.DateTimeFormat(fmtLang, {
          hour: '2-digit', minute: '2-digit', second: '2-digit',
          /* 中文页强制 24h（zh locale 默认 12h 带"上午/下午"）；非中文页跟随 locale */
          hour12: isZh ? false : undefined
        });
        var dateFmt = new Intl.DateTimeFormat(fmtLang, {
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
        tickClock = function () {
          var now = new Date();
          timeEl.textContent = timeFmt.format(now);
          dateEl.textContent = dateFmt.format(now);
          if (greetEl) greetEl.textContent = greetFor(now.getHours());
        };
        tickClock();
        clockTimer = setInterval(tickClock, 1000);
      }
      function stopClock() {
        if (clockTimer) { clearInterval(clockTimer); clockTimer = null; }
      }
      function startClock() {
        if (!tickClock || clockTimer) return;
        tickClock();
        clockTimer = setInterval(tickClock, 1000);
      }

      /* --- 位置 + 天气：IP 定位（ipwho.is，网络出口城市，无需授权弹窗）
         失败降级为香港坐标；天气用最终坐标查 open-meteo --- */
      var locEl = document.getElementById('heroLoc');
      var weatherEl = document.getElementById('heroWeather');
      var CODES = {
        0: '晴', 1: '晴间多云', 2: '多云', 3: '阴',
        45: '雾', 48: '雾凇',
        51: '毛毛雨', 53: '毛毛雨', 55: '毛毛雨',
        61: '小雨', 63: '中雨', 65: '大雨',
        71: '小雪', 73: '中雪', 75: '大雪',
        80: '阵雨', 81: '阵雨', 82: '强阵雨',
        95: '雷阵雨', 96: '雷雨', 99: '雷雨'
      };
      var CITY_ZH = {
        'Hong Kong': '香港', 'Beijing': '北京', 'Shanghai': '上海',
        'Shenzhen': '深圳', 'Guangzhou': '广州', 'Macao': '澳门',
        'Taipei': '台北', 'Hangzhou': '杭州', 'Chengdu': '成都',
        'Nanjing': '南京', 'Wuhan': '武汉', 'Xian': '西安',
        'Singapore': '新加坡', 'Tokyo': '东京', 'Osaka': '大阪',
        'Seoul': '首尔', 'London': '伦敦', 'Paris': '巴黎',
        'Berlin': '柏林', 'New York': '纽约', 'Los Angeles': '洛杉矶',
        'San Francisco': '旧金山', 'Sydney': '悉尼', 'Melbourne': '墨尔本',
        'Toronto': '多伦多', 'Vancouver': '温哥华'
      };
      function fetchWeather(lat, lon) {
        if (!weatherEl) return;
        var ctrl = new AbortController();
        var guard = setTimeout(function () { ctrl.abort(); }, 6000);
        fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current=temperature_2m,weather_code', {
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
      if (locEl && weatherEl) {
        var ctrl = new AbortController();
        var guard = setTimeout(function () { ctrl.abort(); }, 5000);
        fetch('https://ipwho.is/', { signal: ctrl.signal })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            clearTimeout(guard);
            if (d && d.success && d.city) {
              locEl.textContent = CITY_ZH[d.city] || d.city;
              fetchWeather(d.latitude, d.longitude);
            } else {
              fetchWeather(22.337, 114.263);
            }
          })
          .catch(function () {
            clearTimeout(guard);
            fetchWeather(22.337, 114.263);
          });
      } else if (weatherEl) {
        fetchWeather(22.337, 114.263);
      }

      /* --- 照片按压反馈（第一百六十三批 2026-08-24 主人"主页图片按压手感与
          游戏窝卡片一致"）---
         从 mousedown/mouseup + touch 双轨改为 Pointer Events 统一（对照游戏卡
         批 154/155/156 同款结构）：
         - pointerdown：60ms 压扁（scale 乘 0.97）；起点取 getComputedStyle 实际
           渲染位 → 回弹未播完快速连点不跳变（156 批同款哲学）；
         - pointerup（卡片内外松开）：先读实际压扁位 → cancel → 280ms 弹簧回弹
           （cubic-bezier(0.34,1.56,0.64,1) 自带过冲）；
         - pointercancel（触屏滚动接管手势）：120ms 快速归位，不留压扁残影；
         - fine 判定 hover 终点（触屏 :hover 粘滞 → 恒走基础位，与 CSS
           @media (hover:none) 的 --lift/--scale 归零一致，155 批同款）；
         - 不 preventDefault：滚动不受影响，iOS 长按系统菜单照常弹出；
         - touch-action: manipulation（CSS）保留：禁双击缩放、允许平移滚动。 */
      /* 复用外层 IIFE 顶部已声明的 artCard（line 231，hero.querySelector('.hero-art-card')），
         这里不再重新 querySelector 同一个元素 —— 重构搬块时漏删的 var 声明 */
      if (artCard && 'PointerEvent' in window) {
        var pressAnim = null;
        var releaseAnim = null;
        var pressed = false;
        var finePress = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        function readVar(name, fallback) {
          var v = getComputedStyle(artCard).getPropertyValue(name).trim();
          return v || fallback;
        }
        function tfAt(scaleVal) {
          /* hover 终点只在真能悬浮的细指针设备生效；触屏恒走基础位。
             --scale 基础 1 / hover 1.02，压扁系数相乘保持比例（hover 时
             1.02×0.97≈0.989，回弹 ×1 回 1.02） */
          var hovered = finePress && artCard.matches(':hover');
          var lift = hovered ? readVar('--lift', '0px') : '0px';
          var tilt = readVar('--tilt', '-2deg');
          var baseScale = parseFloat(hovered ? readVar('--scale', '1') : '1') || 1;
          return 'rotate(' + tilt + ') translateY(' + lift + ') scale(' + (baseScale * scaleVal).toFixed(4) + ')';
        }
        function release(quick) {
          if (!pressed) return;
          pressed = false;
          var from = getComputedStyle(artCard).transform;
          if (pressAnim) { pressAnim.cancel(); pressAnim = null; }
          var to = tfAt(1);
          lastTo = to;
          releaseAnim = artCard.animate([
            { transform: from, offset: 0 },
            { transform: to, offset: 1 }
          ], { duration: quick ? 120 : 280, easing: quick ? 'ease-out' : 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
          releaseAnim.onfinish = function () { releaseAnim = null; };
        }
        /* 第一百六十四批（2026-08-24 主人"卡外松开后立刻悬停回卡片，会有一点点的
           瞬移"）：回弹动画播放中 hover 翻转 —— 松开的瞬间指针在卡外 → 动画终点
           按 base 位判定（tfAt 读实时 :hover = false）；280ms 动画播放期间用户立刻
           悬停回卡片，CSS 层已切到 hover 位（--lift -6px / --scale 1.02），而动画
           终点仍是 base 位 → 动画结束后元素从 base 突跳到 hover 位 = 瞬移。
           修法：pointerenter/leave 时若终点判定值变化（lastTo 对比），cancel 当前
           回弹并从实际渲染位重新 animate 到新终点 —— 起点=动画中途实际位（无跳变），
           终点=实时 hover 判定（落地即对齐 CSS 层，无突跳）。 */
        var lastTo = '';
        function retargetRelease() {
          if (!releaseAnim || pressed) return;
          var to = tfAt(1);
          if (to === lastTo) return;
          lastTo = to;
          var from = getComputedStyle(artCard).transform;
          releaseAnim.cancel();
          releaseAnim = artCard.animate([
            { transform: from, offset: 0 },
            { transform: to, offset: 1 }
          ], { duration: 280, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
          releaseAnim.onfinish = function () { releaseAnim = null; };
        }
        artCard.addEventListener('pointerenter', retargetRelease);
        artCard.addEventListener('pointerleave', retargetRelease);
        artCard.addEventListener('pointerdown', function (e) {
          /* 只响应左键（button=0）：右键/中键会弹系统菜单，压扁动画会与菜单错乱。
             touch 事件无 button 属性（undefined），短路跳过检查正常触发 */
          if (e && e.button !== undefined && e.button !== 0) return;
          if (pressed) return;
          pressed = true;
          if (releaseAnim) { releaseAnim.cancel(); releaseAnim = null; }
          var from = getComputedStyle(artCard).transform;
          pressAnim = artCard.animate([
            { transform: from, offset: 0 },
            { transform: tfAt(0.97), offset: 1 }
          ], { duration: 60, easing: 'ease-out', fill: 'forwards' });
        });
        window.addEventListener('pointerup', function () { release(false); });
        window.addEventListener('pointercancel', function () { release(true); });
      }

      /* === 性能：hero 滚出视口 → 暂停打字机 + 时钟（canvas 背景不暂停）===
         IntersectionObserver 只观察 hero（不是 watch 全文档 scroll），开销 O(1)。
         hero 整体在视口内（isIntersecting=true）→ 起动画；整体离开视口 → 停打字机/时钟。
         滚回视口时打字机从上次停下的 ci/li 接着打（进度保留）；时钟立即刷一次并恢复。
         canvas 背景全程运行（粒子/飘带是 hero → 落眸笑歌触 全站的统一背景）：
         hero/sentinel 双 IO 控同一资源在"向下滚"路径会死锁——hero 先 pause，
         resume 永不触发 → 5 屏全程无粒子（2026-08-18 实测 canvas 全 0 像素）。
         节能只靠各 canvas 自己的 visibilitychange 切后台暂停，单源控制最稳。 */
      if (hero && 'IntersectionObserver' in window) {
        var perfIO = new IntersectionObserver(function (entries) {
          for (var i = 0; i < entries.length; i++) {
            var e = entries[i];
            if (e.target === hero) {
              /* hero IO 只控 typewriter/clock，不碰 canvas */
              if (e.isIntersecting) {
                startTypewriter();
                startClock();
              } else {
                stopTypewriter();
                stopClock();
              }
            }
          }
        }, { threshold: 0 });

        perfIO.observe(hero);
        /* sentinel 已移除（2026-08-18）：它锚在 main 底部 + 1 屏，向下滚从不触发 resume
           （hero pause 后 canvas 永久暂停），且末尾触发 pause+clearRect 清屏 → 触 之后
           整屏无粒子。canvas 持续绘制，切后台暂停由 canvas 各自的 visibilitychange 兜底 */
      }
    })();

    /* === 游戏窝卡片 按压回弹（第一百三十八批 2026-08-22 主人"点击动效弹一点"）===
       与 hero 立绘同款手感：按下 60ms 压扁 scale(0.97) 保持 → 松开 280ms
       back 缓动回弹（cubic-bezier(0.34,1.56,0.64,1)，y>1 自带过冲 → "弹"）。
       transform 从 --gt-tilt/--gt-x/--gt-y/--gt-hover-y 变量构造（与 CSS hover 落点同值），
       hover 态由 .game-tile-wrap 实时判定 → 回弹终点 = 悬停位或基础位。
       松开绑 window：卡片内外松开都回弹；不挂 leave（拖出未松开不提前回弹）。
       第一百四十批：release 起点取 getComputedStyle 当前实际变换（拖出卡片外松开不跳变）。
       第一百五十四批（2026-08-23 主人"手机版游戏区和电脑一样变为可点击"）：
       原实现 pointer:coarse（触屏）直接跳过，只剩 CSS :active —— iOS Safari 的
       :active 需 touchstart 激活、默认不触发 → 手机端点卡片毫无反馈。
       改用 Pointer Events（pointerdown/pointerup，鼠标+触屏统一）：
       - 触屏按下也走压扁/回弹，与电脑手感一致；
       - touch-action: pan-y（CSS 已有）保证纵向滚动不受影响，点击/轻按才触发；
       - 触屏无 :hover，tfAt 走基础散落位 → 回弹终点正确；
       - 触屏按住拖出卡片再松开，window 级 pointerup 兜底回弹。 */
    (function () {
      var tiles = document.querySelectorAll('.game-tile');
      if (!tiles.length) return;
      if (!('PointerEvent' in window)) return; /* 老浏览器降级：无按压反馈（CSS :active 兜底） */
      /* 第一百五十五批（2026-08-23 主人"游戏区卡片触碰点击动画和鼠标悬浮动画冲突，适配触碰设备"）：
         触屏（hover:none + pointer:coarse）的 :hover 是"粘滞"的 —— 手指点过之后浏览器
         一直把它当作 hover 命中，wrap.matches(':hover') 在触屏上恒为 true → 按压动画
         把卡片从散落位瞬间拉直成悬浮位（而 CSS 触屏规则又禁用 hover 位移）→ 一按就跳变。
         修法：hover 终点只在"真能悬浮"的细指针设备上生效（与滚轮平滑同款 fine 判定，
         script.js 顶部第 19 行同一媒体查询）——触屏按压/回弹全程走基础散落位，
         与 CSS 触屏规则一致，触碰点击动画不再与悬浮动画冲突。 */
      var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      function readVar(el, name, fb) {
        var v = getComputedStyle(el).getPropertyValue(name).trim();
        return v || fb;
      }
      function tfAt(tile, scaleVal) {
        var wrap = tile.closest('.game-tile-wrap');
        var hovered = fine && !!(wrap && wrap.matches(':hover'));
        var tilt = hovered ? '0deg' : readVar(tile, '--gt-tilt', '0deg');
        var x = hovered ? '0px' : readVar(tile, '--gt-x', '0px');
        var y = hovered ? readVar(tile, '--gt-hover-y', '-8px') : readVar(tile, '--gt-y', '0px');
        return 'rotate(' + tilt + ') translateX(' + x + ') translateY(' + y + ') scale(' + scaleVal + ')';
      }
      Array.prototype.forEach.call(tiles, function (tile) {
        var pressAnim = null, releaseAnim = null, pressed = false;
        /* 统一松开出口（第一百五十五批）：
           pointerup（卡片内外松开）→ 280ms 弹簧回弹（第一百四十批：先读后 cancel，
           起点取按压动画定格的实际压扁位，终点按松开瞬间 :hover 判定）；
           pointercancel（触屏滚动接管手势）→ 120ms 快速归位 —— 原来没监听
           pointercancel：手机上从卡片起滑滚动页面时浏览器接管手势、只发 cancel
           不发 up → pressed 卡死 + fill:forwards 把卡片永久压扁。 */
        function release(quick) {
          if (!pressed) return;
          pressed = false;
          var from = getComputedStyle(tile).transform;
          if (pressAnim) { pressAnim.cancel(); pressAnim = null; }
          var to = tfAt(tile, 1);
          lastTo = to;
          releaseAnim = tile.animate([
            { transform: from, offset: 0 },
            { transform: to, offset: 1 }
          ], { duration: quick ? 120 : 280, easing: quick ? 'ease-out' : 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
          releaseAnim.onfinish = function () { releaseAnim = null; };
        }
        /* 第一百六十四批：同 hero 图 —— 卡外松开后立刻悬停回卡片，回弹动画终点
           （base 位）与 CSS hover 层（上浮位）错位 → 动画结束突跳瞬移。
           pointerenter/leave 时终点判定值变化则从实际渲染位重定向动画。 */
        var lastTo = '';
        function retargetRelease() {
          if (!releaseAnim || pressed) return;
          var to = tfAt(tile, 1);
          if (to === lastTo) return;
          lastTo = to;
          var from = getComputedStyle(tile).transform;
          releaseAnim.cancel();
          releaseAnim = tile.animate([
            { transform: from, offset: 0 },
            { transform: to, offset: 1 }
          ], { duration: 280, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
          releaseAnim.onfinish = function () { releaseAnim = null; };
        }
        tile.addEventListener('pointerenter', retargetRelease);
        tile.addEventListener('pointerleave', retargetRelease);
        tile.addEventListener('pointerdown', function (e) {
          /* 只响应主指针（鼠标左键 / 触屏主触点）；忽略右键/中键 */
          if (e && e.button !== undefined && e.button !== 0) return;
          if (pressed) return;
          pressed = true;
          /* 第一百五十六批：起点取当前实际渲染位 —— 上次回弹未播完就再次按下时
             （快速连点 280ms 内），从 tfAt(1) 起压会从回弹中途瞬间跳到完整位 → 跳变；
             读 getComputedStyle 从当前位置起压，与 release 的"先读后 cancel"同款哲学 */
          if (releaseAnim) { releaseAnim.cancel(); releaseAnim = null; }
          var from = getComputedStyle(tile).transform;
          pressAnim = tile.animate([
            { transform: from, offset: 0 },
            { transform: tfAt(tile, 0.97), offset: 1 }
          ], { duration: 60, easing: 'ease-out', fill: 'forwards' });
        });
        window.addEventListener('pointerup', function () { release(false); });
        window.addEventListener('pointercancel', function () { release(true); });
      });
    })();

    /* === 联系卡 按压回弹（第一百五十五批 2026-08-23 主人"联系区卡片按住卡片、
       在卡片外松开鼠标，动画好奇怪，统一解决"）===
       旧实现纯 CSS :active/:hover 过渡：mousedown 压扁后一拖出卡片，:active 与
       :hover 同时熄灭 → 卡片在鼠标【还按着】时就提前弹回基础位；叠加 ::before
       命中区（inset -8px）再添一层阈值，拖出过程会经历 压扁→上浮→归位 多次转向，
       看起来"动画好奇怪"。
       与游戏卡（上一段）统一：Pointer Events + window 级松开兜底 ——
       - pointerdown：60ms 压扁 scale(0.97)，保持悬浮位高度（fine 指针 hover 时），
         按住拖到卡片外也不会提前回弹（WAAPI fill:forwards 钉住按压位）；
       - pointerup（卡片内外松开都触发）：先读实际压扁位 → cancel → 280ms 弹簧
         回弹到 悬浮位（卡内松开）/ 基础位（卡外松开）；
       - pointercancel（触屏滚动接管）：120ms 快速归位，不留压扁残影；
       - 触屏 :hover 粘滞 → fine 判定让触屏全程走基础位（同游戏卡批 155）；
       - 联系卡是 <a>，不 preventDefault，点击跳转不受影响；
       - transform 与滚动入场动画不冲突（入场用独立属性 translate/scale，批 134）。 */
    (function () {
      var cards = document.querySelectorAll('.contact-card');
      if (!cards.length) return;
      if (!('PointerEvent' in window)) return; /* 老浏览器降级：CSS :active 兜底 */
      var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      function tfAt(card, scaleVal) {
        var hovered = fine && card.matches(':hover');
        return 'translateY(' + (hovered ? '-4px' : '0px') + ') scale(' + scaleVal + ')';
      }
      Array.prototype.forEach.call(cards, function (card) {
        var pressAnim = null, releaseAnim = null, pressed = false;
        function release(quick) {
          if (!pressed) return;
          pressed = false;
          var from = getComputedStyle(card).transform;
          if (pressAnim) { pressAnim.cancel(); pressAnim = null; }
          var to = tfAt(card, 1);
          lastTo = to;
          releaseAnim = card.animate([
            { transform: from, offset: 0 },
            { transform: to, offset: 1 }
          ], { duration: quick ? 120 : 280, easing: quick ? 'ease-out' : 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
          releaseAnim.onfinish = function () { releaseAnim = null; };
        }
        /* 第一百六十四批：同 hero 图/游戏卡 —— 卡外松开后立刻悬停回卡片，
           回弹动画终点与 CSS hover 层错位 → 动画结束突跳瞬移。重定向修法同款。 */
        var lastTo = '';
        function retargetRelease() {
          if (!releaseAnim || pressed) return;
          var to = tfAt(card, 1);
          if (to === lastTo) return;
          lastTo = to;
          var from = getComputedStyle(card).transform;
          releaseAnim.cancel();
          releaseAnim = card.animate([
            { transform: from, offset: 0 },
            { transform: to, offset: 1 }
          ], { duration: 280, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
          releaseAnim.onfinish = function () { releaseAnim = null; };
        }
        card.addEventListener('pointerenter', retargetRelease);
        card.addEventListener('pointerleave', retargetRelease);
        card.addEventListener('pointerdown', function (e) {
          /* 只响应主指针（鼠标左键 / 触屏主触点）；忽略右键/中键 */
          if (e && e.button !== undefined && e.button !== 0) return;
          if (pressed) return;
          pressed = true;
          /* 第一百五十六批：与游戏卡同款 —— 起点取当前实际渲染位，快速连点不跳变 */
          if (releaseAnim) { releaseAnim.cancel(); releaseAnim = null; }
          var from = getComputedStyle(card).transform;
          pressAnim = card.animate([
            { transform: from, offset: 0 },
            { transform: tfAt(card, 0.97), offset: 1 }
          ], { duration: 60, easing: 'ease-out', fill: 'forwards' });
        });
        window.addEventListener('pointerup', function () { release(false); });
        window.addEventListener('pointercancel', function () { release(true); });
      });
    })();

    /* === 落眸笑歌触 · 全屏钉住滑动(5 屏)· 滚动 scrub 引擎 ===
     机制(2026-08-18 由 scroll-snap 改 sticky pin,主人诉求):
       - 每屏 .vslide-wrap 提供滚动行程(100vh + --pin-ext),内层 .vslide sticky 钉住
         → 滚动时页面不移动,屏钉在视口;行程滚完 sticky 释放 → 下一屏钉住
       - JS 按局部进度 p = clamp((scrollY - wrapTop) / ext) ∈ [0,1] 驱动字和图片:
           入场 p∈[0, .34]  巨字/副文案/图从 IN 锚点滑入(各 data-anim 语义)
           驻留 p∈[.34, .66] 全显静止(完整观看,滚动经过时字和图都停稳)
           离场 p∈[.66, 1]  元素滑向 OUT 锚点 + 淡出 → 下一屏接力
       - 最后一屏(触)例外:主页终点,无交接对象 → p clamp 在 0.66(REST 末端),
         离场不播,滚动到底 触 全显钉住收官(2026-08-18 修"下方空白页")
       - 锚点插值:IN → REST(easeOutCubic) → OUT(easeOutCubic 拖尾),transform/opacity/filter 全内联
       - 性能:wrap top/ext 缓存,resize / fonts / hero 图 load 失效重测;rAF 节流
       - 背景透明 → 露出全屏 canvas-nest 粒子 + ribbons 飘带(全局背景统一)
       - 字体复用:与 hero 同族 IBM Plex Serif / Sans / Mono,不引新字体 */
    (function () {
      var wraps = document.querySelectorAll('.vslide-wrap');
      if (!wraps.length) return;

      /* 每屏动画规格:元素三锚点 IN(入场起点)/ REST(驻留全显)/ OUT(离场终点)。
         字段:y = 位移(vh 单位),s = scale,rot = rotate(deg),blur = blur(px),op = opacity。
         省略字段取默认 y0 / s1 / rot0 / blur0 / op1(REST 天然全显)。
         语义:01 落 fall(自上坠入) / 02 眸 focus(对焦) / 03 笑 bloom(云涌) /
              04 歌 swing(摇摆) / 05 触 reach(试探伸近 + 缩回定格)。
         2026-08-19 02:50 优化:visual 按屏语义定制入场(雨坠/对焦/云涌/微摆/伸近),
         离场微调;入场错峰见 setFrame(delayMap)
         2026-08-19 07:58:新增 meta 键(章节号 01-05,5 屏统一)—— 自上滑入/上滑出,
         与巨字同拍(delay 0),数字先落位、大字跟上,编辑式"目录编号"动效;
         底部图注 .vslide-note 已移除,el/SPEC 同步清理 */
      var SPEC = {
        fall: {
          meta:   { IN: { y: -12, op: 0 }, REST: {}, OUT: { y: -8,  op: 0 } },
          glyph:  { IN: { y: -32, op: 0 }, REST: {}, OUT: { y: -18, op: 0 } },
          sub:    { IN: { y: 12,  op: 0 }, REST: {}, OUT: { y: -8,  op: 0 } },
          visual: { IN: { y: -14, op: 0 }, REST: {}, OUT: { y: -16, op: 0 } } /* 雨:自上坠入,离场继续坠 */
        },
        focus: {
          meta:   { IN: { y: -12, op: 0 }, REST: {}, OUT: { y: -8,  op: 0 } },
          glyph:  { IN: { s: 2.4, blur: 14, op: 0 }, REST: {}, OUT: { s: 0.82, blur: 6, op: 0 } },
          sub:    { IN: { y: 12,  op: 0 }, REST: {}, OUT: { y: -8,  op: 0 } },
          /* REST {} = 原尺寸(2026-08-18 晚):眸 1:1 方图不再驻留放大(主人嫌大);
             2026-08-18 22:00 主人定稿"全部改为 500"→ 眸 500x509,取消 focus 限宽;
             IN s:1.3 入场失焦放大保留(对焦语义),OUT 跟随 */
          visual: { IN: { y: 12, s: 1.3, op: 0 }, REST: {}, OUT: { y: -10, s: 1.05, op: 0 } }
        },
        bloom: {
          meta:   { IN: { y: -12, op: 0 }, REST: {}, OUT: { y: -8,  op: 0 } },
          glyph:  { IN: { s: 0.3, blur: 8, op: 0 }, REST: {}, OUT: { s: 1.12, blur: 4, op: 0 } },
          sub:    { IN: { y: 12,  op: 0 }, REST: {}, OUT: { y: -8,  op: 0 } },
          visual: { IN: { y: 8, s: 0.88, op: 0 }, REST: {}, OUT: { y: -10, s: 1.05, op: 0 } } /* 云涌:微缩涨开 */
        },
        swing: {
          meta:   { IN: { y: -12, op: 0 }, REST: {}, OUT: { y: -8,  op: 0 } },
          glyph:  { IN: { rot: -7, op: 0 }, REST: {}, OUT: { rot: 7, op: 0 } },
          sub:    { IN: { y: 12,  op: 0 }, REST: {}, OUT: { y: -8,  op: 0 } },
          visual: { IN: { y: 8, rot: -4, op: 0 }, REST: {}, OUT: { y: -10, rot: 3, op: 0 } } /* 摇摆:微摆入 */
        },
        reach: {
          meta:   { IN: { y: -12, op: 0 }, REST: {}, OUT: { y: -8,  op: 0 } },
          /* 2026-08-20:REST s:0.96 → 删,落 true identity —— 配合 glyph/sub/poem 去 will-change +
             setFrame identity 写 transform:none,让 REST 期脱合成层、文字原生渲染,消除下方雾影与抽动。
             原 0.96 "缩回定格" 设计取舍:伸近 + 4% 微缩;现改为"伸近定格 at 全尺寸"(从下方升起落定),
             触 语义上"抵达"全貌亦合。视觉差 4%, 渲染质量提升明显 */
          glyph:  { IN: { y: 26, op: 0 }, REST: {}, OUT: { y: -14, s: 0.9, op: 0 } },
          sub:    { IN: { y: 12,  op: 0 }, REST: {}, OUT: { y: -8,  op: 0 } },
          visual: { IN: { y: 24, op: 0 }, REST: { y: -0.8 }, OUT: { y: -12, op: 0 } }
        }
      };

      /* 阶段窗口(占行程比例):入场 [0, IN_END] / 驻留 [IN_END, OUT_START] / 离场 [OUT_START, 1] */
      var IN_END = 0.34, OUT_START = 0.66;
      /* 第一百三十三批：触摸设备禁用 blur 插值 —— focus/bloom 屏巨字入场/离场带
         filter: blur() 动画，每帧变化会创建离屏模糊层（GPU 大户），移动端滚动时
         叠加背景 canvas + 5 屏 scrub 造成卡顿。touch 端 blur 恒 0 → 写 filter:none，
         保留 transform/opacity 位移动效（入场语义不变，只是去掉模糊）。 */
      var isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

      function easeOutCubic(t) { var u = 1 - t; return 1 - u * u * u; }
      function lerp(a, b, t)   { return a + (b - a) * t; }

      /* 缓存每屏:wrap/slide/元素引用/动画规格/几何(top+ext 待测量) */
      var slides = [];
      for (var i = 0; i < wraps.length; i++) {
        var w = wraps[i];
        var s = w.querySelector('.vslide');
        if (!s) continue;
        var anim = s.dataset.anim || 'fall';
        slides.push({
          wrap: w,
          spec: SPEC[anim] || SPEC.fall,
          el: {
            meta:   s.querySelector('.vslide-meta'), /* 章节号(2026-08-19 加 scrub):01-05 + 横线 + kind,自上滑入/上滑出,与巨字同拍 */
            glyph:  s.querySelector('.vslide-glyph'),
            sub:    s.querySelector('.vslide-sub'),
            poem:   s.querySelector('.vslide-poem'), /* 两行诗(2026-08-18 加):SPEC 无 poem 键 → setFrame fallback 到 spec.sub 锚点(延迟淡入淡出,与副文案同拍) */
            visual: s.querySelector('.vslide-visual')
          },
          top: 0, ext: 0, off: 0, /* 第一百六十一批：off 默认 0 —— measure 前首帧 update 不读到 undefined */
          lastP: -1 /* 第一百三十三批：上一帧进度缓存，p 未变化跳过 setFrame（省无谓写入） */
        });
        /* 第一百四十三批：vslide 懒加载图就绪前透明 → 就绪后淡入（防滚动/刷新时弹出闪现） */
        markImageLoaded(s.querySelector('.vslide-img'));
      }
      if (!slides.length) return;
      /* 最后一屏(触)是主页终点:没有下一页可交接,离场动画只会把屏淡出后滚出视口,
         露出 wrap 底部的 ~1 屏空白尾(主人反馈"下方空白页")。isLast 标记 → update 里
         clamp 进度在 REST 末端,滚动到底 触 保持全显钉住 = 主页以触 收官 */
      slides[slides.length - 1].isLast = true;

      /* 第一百五十九批（2026-08-24 主人"都优化一下/开工吧"）：
         CSS scroll-driven 接管 —— 动画整体跑合成器线程（scroll(root) + animation-range），
         主线程零 scrub。JS 只保留：量每屏 top/ext（measure）+ 写 5 元素 range。
         错峰（meta/glyph/visual/sub/poem 的入场窗口）经不同 range 区间表达
         （scroll-driven 不支持 animation-delay）。range 值 = 绝对文档 scroll 坐标，
         resize/字体/hero 图加载后失效重算（与 JS 版 measure 同一套 invalidate 时机）。
         检测语法与 CSS @supports (animation-timeline: scroll(root)) 严格一致：
         两端同用 scroll(root)，避免"CSS 生效但 JS 没跳走"或反过来的不一致。 */
      var cssDriven = false;
      try { cssDriven = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll(root)')); } catch (e) {}
      /* 第一百七十批（2026-08-25 主人"Safari 五幕雨还没结束就到落"）：
         Safari(WebKit) 稳定版 26/27 的 CSS scroll-driven animations 在 sticky 屏上
         animation-range 起点计算有 bug —— 首屏「落」入场 range 起点偏早，第一百
         六十一批的 inShift 延后不生效，过渡带（五幕雨）还没滑完「落」已开始入场。
         Chrome/Firefox 正常；headless nightly WebKit 正常、Safari 稳定版复现。
         降级方案：Safari/WebKit 强制走 JS scrub 路径（第一百六十一批 pBase 延后
         是纯 JS 计算，行为与 Chrome 一致），并注入 style 禁用 CSS scroll-driven
         动画（浏览器仍支持 scroll(root)，否则 CSS 动画 + JS 引擎双驱动错乱）。
         其余浏览器保持 CSS 路径（合成器线程，性能优）。UA 检测排除含 Chromium/
         Edge/Opera 的引擎（其 UA 也带 AppleWebKit 标记）。 */
      if (cssDriven &&
          /AppleWebKit/.test(navigator.userAgent) &&
          !/Chrome|Chromium|Edg|OPR|CriOS|FxiOS/.test(navigator.userAgent)) {
        cssDriven = false;
        var safariNoAnim = document.createElement('style');
        safariNoAnim.textContent =
          '.vslide-glyph,.vslide-meta,.vslide-sub,.vslide-poem,.vslide-visual{animation:none!important}';
        document.head.appendChild(safariNoAnim);
      }
      /* 入场错峰区间（占行程比例）：与 setFrame delayMap/winMap 一一对应 */
      var RANGE_IN = {
        meta:   [0,      0.187],
        glyph:  [0,      0.34],
        visual: [0.0748, 0.2618],
        sub:    [0.153,  0.323],
        poem:   [0.204,  0.34]
      };
      if (cssDriven) {
        /* 把每屏 5 元素的 animationRange 写成 inline（一次写完，非逐帧）。
           末屏 reach 只有入场段（clamp 语义 → 播完 REST 保持，不写离场段）。 */
        function applyRanges() {
          for (var ri = 0; ri < slides.length; ri++) {
            var rd = slides[ri];
            var st = rd.top, ln = rd.ext, en = st + ln;
            var outS = st + OUT_START * ln;
            /* 第一百六十一批（2026-08-24 主人"五幕雨滑动还没结束就显示落"）：
               首屏「落」入场整体延后 off（nav 高）—— 原公式从 st（wrap 顶 - off）起算，
               入场比过渡带(pin)释放点早 off px：pin 尾部眉标/副题还没滑出，落 已开始淡入。
               延后 off 后 inS = st + off = wrapTop = pin 释放点 —— 五幕雨完全滑出才入场。
               其余 4 屏不动（与上屏离场交叉淡化是设计意图，--pin-ov）。 */
            var inShift = ri === 0 ? rd.off : 0;
            for (var rk in rd.el) {
              var rel = rd.el[rk];
              if (!rel) continue;
              var ir = RANGE_IN[rk] || RANGE_IN.glyph;
              var inS = st + inShift + ir[0] * ln, inE = st + inShift + ir[1] * ln;
              if (rd.isLast) {
                rel.style.animationRange = inS.toFixed(1) + 'px ' + inE.toFixed(1) + 'px';
              } else {
                rel.style.animationRange = inS.toFixed(1) + 'px ' + inE.toFixed(1) + 'px, ' +
                  outS.toFixed(1) + 'px ' + en.toFixed(1) + 'px';
              }
            }
          }
        }
        var reapplyRanges = function () {
          /* sy 是本 IIFE 尾部（JS 引擎路径）才赋值的 hoisted var，
             必须先取当前 scrollY，否则 d.top = NaN → animationRange "NaNpx"
             被浏览器判非法值丢弃（range 一直为空） */
          try {
            sy = window.scrollY || 0;
            measure();
            applyRanges();
          } catch (err) { /* 测量失败不阻塞页面其余部分 */ }
        };
        window.addEventListener('resize', reapplyRanges);
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(reapplyRanges);
        }
        var cssHero = document.getElementById('hero');
        var cssImg = cssHero ? cssHero.querySelector('img') : null;
        if (cssImg) {
          if (cssImg.complete) reapplyRanges();
          else cssImg.addEventListener('load', reapplyRanges);
        }
        window.addEventListener('load', reapplyRanges);
        setTimeout(reapplyRanges, 500);
        reapplyRanges();
        return; /* 以下原 JS scrub 引擎不启用（CSS 动画已接管） */
      }

      var vh = window.innerHeight || document.documentElement.clientHeight;
      var sy = 0;

      /* 测量每屏滚动区几何:top = 钉住起点(pin start),ext = 行程 = wrap高 - 屏高。
         读实测(不读 CSS 变量)→ 改 --pin-ext 无需改 JS。
         2026-08-19 修移动端"滑动内容闪没"(两处):
         (1) ext 用 sticky 屏实测高,不用 wrapH - innerHeight —— 屏高是 100svh - navH,
             真实钉住行程比 wrapH - innerHeight 长 navH px;旧公式少算 → p=1 提前到,
             离场播完屏还钉着 → 交接缝空带。
         (2) top 用钉住起点 = wrapTop - navH —— sticky 的 top 让位 navH,屏在 wrap 顶
             进入视口前 navH px 就开始钉住;旧公式用 wrapTop → 每屏开头 navH px
             钉住但 p=0(全隐)的"锁屏空带",且 p=1 比释放晚 navH px。
         几何实测后 ext/top 与 URL 栏状态无关(iOS 收起/展开不重算,节奏稳定)。 */
      function measure() {
        /* 第一百七十批（2026-08-25 主人"Safari 五幕雨还没结束就到落"）：
           measure 先同步真实 scrollY —— IO 回调/invalidate 触发 measure 时，
           IIFE 的 sy 可能还是旧值（初始 0 或上次滚动值），导致
           d.top = r.top + sy - off 算错（首屏「落」d.top 被算成 ~1113 而非
           wrapTop 2734）→ 后续所有 p 提前 ~1600px → 过渡带（五幕雨）未滑完
           「落」已入场+离场。Chrome 走 CSS 路径时 reapplyRanges 在 measure 前
           已赋 sy（无此问题）；Safari 降级 JS 路径后暴露。此处统一取真实值，
           CSS 路径的 reapplyRanges 重复赋值无害。 */
        sy = window.scrollY || 0;
        var w = window.innerWidth;
        if (w !== lastW) {
          lastW = w;
          vh = window.innerHeight || document.documentElement.clientHeight;
        }
        for (var i = 0; i < slides.length; i++) {
          var d = slides[i];
          var r = d.wrap.getBoundingClientRect();
          var st = d.wrap.querySelector('.vslide');
          var sh = st ? st.getBoundingClientRect().height : vh;
          var off = st ? (parseFloat(getComputedStyle(st).top) || 0) : 0;
          d.top = r.top + sy - off;   /* 钉住起点 = wrap 顶 - nav 让位 */
          d.off = off;                /* 第一百六十一批：nav 让位值缓存 —— 首屏「落」入场延后用（pin 释放点 = d.top + off） */
          d.ext = Math.max(1, r.height - sh);
        }
      }

      /* (旧 IO 触发 .is-in 入场 + animationend 收尾已随 scroll-snap 机制移除;
         现由下方滚动 scrub 引擎按进度驱动,无一次性入场动画) */

      /* === 每屏 scrub:按局部进度 p 插值三锚点,写 inline transform/opacity/filter ===
         入场 easeOutCubic / 离场 easeOutCubic(2026-08-18 改:对齐过渡带 easeOut 语义,
         滑出先快后慢的拖尾,配合长行程更从容;原 easeInCubic 末段加速闪出偏急)
         入场错峰:glyph → visual → sub → poem 依次延迟(见 setFrame delayMap);
         blur 阈值 <0.01px 时写 none(避免无谓 filter 层)。 */
      function setFrame(d, p) {
        var spec = d.spec;
        for (var k in d.el) {
          var el = d.el[k];
          if (!el) continue;
          var a = spec[k] || spec.sub;
          var IN = a.IN || {}, REST = a.REST || {}, OUT = a.OUT || {};
          var t, from, to, e;
          if (p <= IN_END) {
            /* 入场错峰(2026-08-19 02:50):glyph 0 → visual 0.22 → sub 0.45 → poem 0.6,
               四元素先后递进(巨字先动,图跟上,引子,诗句最后);各自窗口在 IN_END 前完成
               2026-08-19 07:58:meta 加 delay 0 —— 章节号与巨字同拍,数字先落位、大字跟上 */
            var delayMap = { meta: 0, glyph: 0, visual: IN_END * 0.22, sub: IN_END * 0.45, poem: IN_END * 0.6 };
            var winMap   = { meta: IN_END * 0.55, visual: IN_END * 0.55, sub: IN_END * 0.5, poem: IN_END * 0.4 };
            var start = delayMap[k] || 0;
            var win = winMap[k] || IN_END;
            t = p <= start ? 0 : Math.min(1, (p - start) / win);
            from = IN; to = REST; e = easeOutCubic(t);
          } else if (p >= OUT_START) {
            t = Math.min(1, (p - OUT_START) / (1 - OUT_START));
            from = REST; to = OUT; e = easeOutCubic(t);
          } else {
            t = 1; from = REST; to = REST; e = 1;
          }
          var y   = lerp(from.y   || 0, to.y   || 0, e);
          var s   = lerp(from.s   || 1, to.s   || 1, e);
          var rot = lerp(from.rot || 0, to.rot || 0, e);
          var blur = lerp(from.blur || 0, to.blur || 0, e);
          if (isTouch) blur = 0; /* 第一百三十三批：触摸端禁用 blur（省离屏模糊层） */
          var op   = lerp(from.op === undefined ? 1 : from.op,
                          to.op   === undefined ? 1 : to.op, e);
          /* 2026-08-20 修巨字渲染瑕疵:identity 时写 transform:none/filter:none/opacity:1,
             浏览器撤销合成层 → 文本落回原生 subpixel AA,消除"下方雾影/中下方抽动"。
             阈值 y<0.005vh(≈0.045px)/ rot<0.005°/ |s-1|<0.0005 / blur≤0.01 / op≥0.999。
             配合 CSS 删 will-change 生效(2026-08-20 同步把 reach REST s:0.96 改为 identity,
             使末屏 触 也能落回原生渲染,代价是失去 4% 微缩定格,改"伸近定格 at 全尺寸") */
          var tStr, fStr, oStr;
          if (Math.abs(y) < 0.005 && Math.abs(rot) < 0.005 && Math.abs(s - 1) < 0.0005 &&
              blur <= 0.01 && op >= 0.999) {
            tStr = 'none';
            fStr = 'none';
            oStr = '1';
          } else {
            tStr = 'translate3d(0, ' + ((y * vh) / 100).toFixed(2) + 'px, 0) rotate(' +
              rot.toFixed(2) + 'deg) scale(' + s.toFixed(3) + ')';
            fStr = blur > 0.01 ? 'blur(' + blur.toFixed(2) + 'px)' : 'none';
            oStr = op.toFixed(3);
          }
          /* 第一百五十七批：逐元素写缓存 —— 值未变（如元素还在入场延迟窗口、
             REST 恒等态）跳过 DOM 写入；滚动五屏时只写实际在动的元素 */
          if (el.__vsT !== tStr) { el.style.transform = tStr; el.__vsT = tStr; }
          if (el.__vsF !== fStr) { el.style.filter = fStr; el.__vsF = fStr; }
          if (el.__vsO !== oStr) { el.style.opacity = oStr; el.__vsO = oStr; }
        }
      }

      var vsTicking = false;
      function update() {
        vsTicking = false;
        sy = window.scrollY || window.pageYOffset || 0;
        for (var i = 0; i < slides.length; i++) {
          var d = slides[i];
          /* 第一百六十一批：首屏「落」入场延后 off（与 CSS-driven 分支 applyRanges 的
             inShift 同语义）—— p 基准点从 d.top 改为 d.top + d.off（= pin 释放点），
             行程同步缩短 off（终点仍是 sticky 释放点 d.top + d.ext，p=1 不变）。 */
          var pBase = i === 0 ? d.top + d.off : d.top;
          var pLen  = i === 0 ? Math.max(1, d.ext - d.off) : d.ext;
          var p = (sy - pBase) / pLen;
          if (p < 0) p = 0; else if (p > 1) p = 1;
          /* 最后一屏(触)clamp 在 REST 末端：它是页面终点，离场后视口会露出 wrap
             空尾(空白页)。clamp 后滚动到底，触 仍全显钉在视口，主页以它收官 */
          if (d.isLast && p > OUT_START) p = OUT_START;
          /* 第一百三十三批：进度未变（该屏不在滚动窗口内）跳过 setFrame，
             滚动时只更新进度实际变化的屏，减少每帧 DOM 写入 */
          if (p === d.lastP) continue;
          /* 第一百五十八批（2026-08-24 主人"手机版落眸笑歌触滑动流畅"）：
             驻留区短路 —— 上一帧与本帧 p 都落在 [IN_END, OUT_START] 区间，
             所有元素已落 identity（REST 期 5 屏 × 5 元素 = 25 次循环是纯空转），
             直接跳过 setFrame。进出驻留区边界的那一帧仍正常 setFrame
             （写 identity 或启动 IN/OUT 过渡），其余驻留滚动 = no-op。
             移动端滚动期间每帧省 ~25 次缓存比对 + 字符串拼接 + 5 个对象属性读，
             与过渡带 update + canvas-nest + ribbons 抢主线程时显著减负。
             末屏 isLast clamp 到 OUT_START 后天然落在驻留区内 → 自动短路 */
          if (d.lastP >= IN_END && d.lastP <= OUT_START &&
              p >= IN_END && p <= OUT_START) {
            d.lastP = p; continue;
          }
          d.lastP = p; setFrame(d, p);
        }
      }
      function scheduleUpdate() {
        if (!vslideActive) return;
        if (vsTicking) return;
        vsTicking = true;
        vsRafId = requestAnimationFrame(update);
      }

      /* 几何失效：视口/字体/hero 图尺寸变化 → 重测 top/ext。
         hero 在 vslides 之前，hero 高度变化会平移所有 wrap 的文档坐标 */
      var lastW = window.innerWidth;
      function invalidate() { measure(); scheduleUpdate(); }
      window.addEventListener('resize', invalidate);
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(invalidate);
      }
      var vsHero = document.getElementById('hero');
      var vsImg = vsHero ? vsHero.querySelector('img') : null;
      if (vsImg) {
        if (vsImg.complete) invalidate();
        else vsImg.addEventListener('load', invalidate);
      }
      /* 2026-08-19 修复"Cmd+R 刷新部分显示丢失"：
         刷新时浏览器静默恢复 scrollY（恢复滚动位置不触发 scroll 事件），首帧若 hero 区
         高度未就绪（立绘图/字体），wrap top 测得偏小 → p 偏大 → 各屏被算进离场段（全 opacity 0），
         且 hero img complete（缓存秒开）后 load 监听不再触发 → 错误状态永久固化。
         window load 是资源终态：滚动位置已恢复 + 布局已稳定 → 重测 top/ext + 刷一帧，必修正。
         setTimeout 兜底布局异步稳定（如字体重排）的极端场景，一次性无副作用。 */
      window.addEventListener('load', invalidate);
      setTimeout(invalidate, 500);
      window.addEventListener('scroll', scheduleUpdate, { passive: true });

      /* 第一百五十八批（2026-08-24 主人"都优化一下"）：
         用 IntersectionObserver 在 vs-slides 离开视口时完全停掉 vslide 引擎：
         scheduleUpdate 返回 → 无 rAF → 无 measure/setFrame/DOM 写入。
         用户在 hero/过渡带/页脚滚动时，5 屏 × 5 元素的循环开销 = 0。
         rootMargin 50% ≈ 0.5× 视口缓冲（移动 ~400px / 桌面 ~500px）——
         元素在视口外 ~0.5×vh 时已切换，IO 回调通常先于 scroll 事件触发，
         用户进入下一屏前已就绪。
         "out" 时取消挂起的 rAF（避免关屏后还跑一帧空转）；
         "in" 时立即 measure + update（几何可能在关屏期间变了 = resize/字体到达）。 */
      var vsRafId = null;
      var vslideActive = false;
      var vsSection = document.querySelector('.vs-slides');
      if (vsSection && 'IntersectionObserver' in window) {
        var vsObserver = new IntersectionObserver(function (entries) {
          for (var i = 0; i < entries.length; i++) {
            var e = entries[i];
            if (e.isIntersecting) {
              if (!vslideActive) {
                vslideActive = true;
                /* 关屏期间几何已失效（resize 等）→ 重测 + 写一帧 */
                measure();
                update();
              }
            } else {
              vslideActive = false;
              vsTicking = false;
              if (vsRafId !== null) { cancelAnimationFrame(vsRafId); vsRafId = null; }
            }
          }
        }, { rootMargin: '50% 0px 50% 0px' });
        vsObserver.observe(vsSection);
      } else {
        vslideActive = true; /* 老浏览器降级：始终活跃 */
      }

      /* 首帧：立即测量 + 刷一帧（p=0 全 IN 态，元素 opacity 0 防 FOUC；滚动后接管） */
      invalidate();
    })();


    /* 第一百三十七批：自研 rAF 平滑滚动补间（替代 Lenis scrollTo）——
       逐帧 window.scrollTo + duration + easeInOutCubic，吸附质感与 Lenis 一致；
       新调用会取消进行中的补间（不叠加）。 */
    var smoothScrollTo = (function () {
      var rafId = null;
      return function (targetY, dur) {
        if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
        var startY = window.scrollY || window.pageYOffset;
        var d = targetY - startY;
        if (Math.abs(d) < 1) { window.scrollTo(0, targetY); return; }
        var t0 = performance.now();
        var duration = Math.max(0.05, dur || 0.4) * 1000;
        function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
        function frame(now) {
          var t = Math.min(1, (now - t0) / duration);
          window.scrollTo(0, startY + d * ease(t));
          if (t < 1) { rafId = requestAnimationFrame(frame); }
          else { rafId = null; }
        }
        rafId = requestAnimationFrame(frame);
      };
    })();

    /* === 过渡带：pinned 门（sticky pin + 滚动 scrub） ===
       交互（主人诉求）：
         - hero 区：无动画，字在视口外自然不可见（CSS 默认显示，无需隐藏）
         - 滚到过渡带 → .story-intro sticky 钉住 → 页面视觉不动
         - 在 pin 内滚动：向下滚 → 字依次向下滑出；向上滚 → 字依次从下方滑入
         - 全部字 + 眉标 + 副标题滑出（--pin-scroll 滚完）→ sticky 释放 → 进入下一区域
       算法：
         p = (scrollY - heroBottom) / PIN_SCROLL  ∈ [0, 1]
         heroBottom = hero 底部文档坐标（JS 动态测量，兼容 nav/hero 高度变化）
         PIN_SCROLL 从 CSS 变量 --pin-scroll 读取（与 .story-pin 高度保持同步）
         字 i 滑出进度 prog_i = clamp((p - start_i) / slot, 0, 1)
           start_i = MARGIN + i*slot，slot = (1 - 2*MARGIN) / n
         字 opacity = 1 - prog_i；translateY = prog_i * HIDDEN_OFFSET（向下滑出）
         （2026-08-17 第六十批定型：进场淡出+上浮，窗口 0.8vh；可读性由 MARGIN_START 全显驻留保证——
           驻留区桌面 600px / 移动 480px，观众滑到即看到完整五字静态停留；
           滑出 MARGIN_START 0.3 / MARGIN_END 0.15 解耦，五字每字 220px 慢滑出；
           眉标+副题从 e=0.45 淡入防突现；分隔符 · 跟左边字同进退；
           第六十批新增丝滑跟随：pEff lerp 惯性逼近 p（滚动中拖尾丝滑）+ 每字 easeOut 缓动；
           第六十一批：停止 150ms 直接平滑吸附回全显或到底（不先收敛冻结），动画全程连续；
           第六十二批：帧率无关 + 速度自适应跟随；第一百三十七批：Lenis 已移除，
           过渡带丝滑跟随始终走自研 lerp（原"Lenis 让位"分支删除）；
           第一百五十九批：eEff 已删（登场判定用真实 e，见 update），settling 收敛循环
           已删；第一百六十二批：吸附回弹已整体移除（主人"我不喜欢有反弹"）——
           滚动随惯性自然停止，五字停在真实进度，不弹不吸。
         眉标 + 副标题最后滑出（p ∈ [MARGIN+slot*n, 1]） */
    (function () {
      var hero = document.getElementById('hero');
      var intro = document.getElementById('explore');
      var pin = document.querySelector('.story-pin');
      var glyphs = document.querySelector('.story-intro-glyphs');
      var eyebrow = document.querySelector('.story-intro-eyebrow');
      var sub = document.querySelector('.story-intro-sub');
      if (!intro || !glyphs) return;
      var chars = Array.prototype.slice.call(glyphs.querySelectorAll('.gi'));
      var seps = Array.prototype.slice.call(glyphs.querySelectorAll('.gi-sep'));
      var HIDDEN_OFFSET = 120;   /* 字进场/滑出的最大位移（px），从下方来、往下方去 */
      var charT = [], charO = [], sepT = [], sepO = [];
      /* 第七十二批：登场改时间驱动（滑动触发一次 + 固定时长播放）——
         旧 scrub 让进场速度=滚动速度，轻轻一滑就播完看不清；
         现在每字 900ms + 110ms 间隔，任何滚动速度都能看清完整登场 */
      var ENTRY_MS = 900;        /* 每字登场时长（ms） */
      var ENTRY_STAGGER = 110;   /* 逐字间隔（ms） */
      var TAIL_DELAY = 200;      /* 眉标/副题在五字播完后延迟（ms） */
      var TAIL_MS = 450;         /* 眉标/副题登场时长（ms） */
      var entryStarted = false, entryT0 = 0;
      var MARGIN_START = 0.3;    /* 滑出起点缓冲（=全显驻留）：前 30%，桌面 600px / 移动 480px 的"停留观看"区
                                    —— 观众滑到过渡带后五字完整停留 ~0.7-1s，快滚经过时也是静态大字 */
      var MARGIN_END = 0.15;     /* 滑出终点缓冲（=眉标/副题离场）：后 15%（300px / 移动 240px）
                                    —— 与起点解耦：五字滑出独占 55% 行程（每字 220px / 移动 176px，更慢更从容） */

      /* 丝滑跟随（第六十三批 / 第一百三十七批 Lenis 移除）：始终走自研——
         帧率无关指数平滑 + 速度自适应（快滚松、慢滚紧），滚动惯性由原生滚动承接 */
      var pEff = 0, first = true;
      var lastSy = -1, lastT = 0, vel = 0;   /* 滚动速度 EMA（px/s），驱动自适应跟随 */
      /* 滚动方向（-1=上 / 0=静止 / 1=下），entryStarted 重置判定用（吸附已移除） */
      var scrollDir = 0;
      /* 第一百五十七批：逐元素写缓存 —— 计算值未变时跳过 DOM 写入；
         REST/全显期写 identity（transform:none / translateY(0.2em)）让元素脱离
         合成层，与 vslide 2026-08-20 的"删 will-change + identity 脱层"同一套思路。
         滚动五幕雨/五个屏时，过渡带（视口外）不再每帧刷 12 个 style。 */
      var charT = [], charO = [], sepT = [], sepO = [];
      var tailT = {}, tailO = {};
      /* 第一百五十九批：常驻 rAF 循环的帧间隔（update 读 rafDt 帧率无关 lerp；
         声明于下方循环区）；sep 基线 px 缓存（gi-sep identity 从 em 相对值改
         px 绝对值后，首次写 inline style 时量一次缓存，滚动中不再 getComputedStyle） */
      var sepBasePx = -1;

      /* 与 .story-pin 高度配套：读 CSS 变量，改 CSS 一处即可（桌面 900px / 移动 720px） */
      /* 第一百五十七批（2026-08-23 主人"五幕雨/落眸笑歌触 五个区域手机版滑动不流畅"）：
         --pin-scroll 只随媒体查询（resize）变化 → 缓存实测值；update 热路径不再每帧
         getComputedStyle（读计算样式会强制样式重算，是滚动帧的隐性开销）。 */
      var cachedPS = -1;
      function pinScroll() {
        if (cachedPS >= 0) return cachedPS;
        var v = 900;
        if (pin) {
          var raw = getComputedStyle(pin).getPropertyValue('--pin-scroll').trim();
          if (raw) v = parseFloat(raw) || 900;
        }
        cachedPS = v;
        return v;
      }
      function invalidatePS() { cachedPS = -1; }
      window.addEventListener('resize', invalidatePS);

      function heroBottomY() {
        if (cachedHbY >= 0) return cachedHbY;
        if (!hero) return 0;
        var r = hero.getBoundingClientRect();
        cachedHbY = r.bottom + (window.scrollY || window.pageYOffset);
        return cachedHbY;
      }
      /* hero 文档底部坐标 = r.bottom(viewport) + scrollY(window)。
         hero 高度由 CSS + 字体加载 + 立绘图片决定，文档坐标在三种事件外保持不变：
         1) window.resize（视口变化 → 字号/折行变 → hero 高度变）
         2) document.fonts.ready（字体到达 → 重排）
         3) 立绘图片 onload（intrinsic 尺寸确定 → aspect-ratio 生效）
         缓存消除"每帧 getBoundingClientRect 强制同步布局"（热路径，桌面/移动均受益）。
         不为打字机更新加 invalidate：文字长度相近，行数变化概率低；
         即使 hero 高 1-2px，p/e 偏差 <1%，视觉无感（远小于 vh×0.45 的 entryWindow） */
      var cachedHbY = -1;
      function invalidateHbY() { cachedHbY = -1; }
      window.addEventListener('resize', invalidateHbY);
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(invalidateHbY);
      }
      var hbImg = hero ? hero.querySelector('img') : null;
      if (hbImg) {
        if (hbImg.complete) invalidateHbY();
        else hbImg.addEventListener('load', invalidateHbY);
      }

      function update() {
        var sy = window.scrollY || window.pageYOffset;
        var hb = heroBottomY();
        var vh = window.innerHeight || document.documentElement.clientHeight;
        var ps = pinScroll();

        /* 第一百三十七批：Lenis 门控已移除（原生滚动无 smoothWheel 开关） */

        /* 进场进度 e（第七十二批起只作"触发点"用）：e≥0.12 触发登场时间动画，e<0.02 重置可重播。
           窗口 0.45vh 定位字行进入视口的时刻（第六十八批：旧 0.8vh 让前两字淡入跑屏外） */
        var entryWindow = vh * 0.45;
        var e = Math.min(1, Math.max(0, (sy - (hb - entryWindow)) / entryWindow));
        /* 滑出进度 p：pin 内滚动（scrollY 从 hb 到 hb+ps）
           p=0 全显示 → p=1 全滑出（sticky 释放） */
        var p = Math.min(1, Math.max(0, (sy - hb) / ps));

        /* 丝滑跟随：自研 lerp（帧率无关 + 速度自适应）——
           Lenis 移除后始终走此分支（原 lenisOn 直接对齐的让位分支已删） */
        var now = performance.now();
        var dt = rafDt || (lastT ? (now - lastT) / 1000 : 1 / 60); /* 第一百五十九批：常驻循环用真实帧间隔 */
        lastT = now;
        /* 第一百五十二批：dt 下限保护 —— 同一帧内多个 update（rAF + scroll/resize
           并发）时 dt≈0，(sy-lastSy)/dt 爆炸 → vel 溢出 → k 越界 → Math.pow 负底
           小数幂 = NaN → eEff/pEff 变 NaN → 五字 opacity NaN 渲染为 0 = 卡住
           （用户反馈"过渡带刷新页面卡住"）。dt 下限 1ms 防除零。 */
        dt = Math.max(0.001, dt);
        /* 第一百五十九批：vel 只在 scrollY 变化时累积 —— 常驻循环空转帧 dt 照走
           但 (sy-lastSy)=0，vel 会衰减到 0 再被 scroll 尖峰突然拉满，k 抖动。
           无变化帧保留 vel 前值；末行 lastSy = sy 已在下方统一。 */
        if (lastSy >= 0 && sy !== lastSy) {
          vel += (((sy - lastSy) / dt) - vel) * 0.2;
        }
        lastSy = sy;
        if (first) { pEff = p; first = false; }
        var k = Math.max(0.12, Math.min(0.3, 0.3 - vel / 6000)); /* 第一百五十九批：快滚更跟手，消双重平滑拖尾 */
        var kf = 1 - Math.pow(1 - k, Math.min(3, dt * 60));
        pEff += (p - pEff) * kf;

        if (Math.abs(p - pEff) < 0.002) pEff = p;

        /* 滚动方向簿记（entryStarted 重置判定用） */
        if (lastSy >= 0 && sy !== lastSy) { scrollDir = sy > lastSy ? 1 : -1; }

        /* 第一百五十八批（2026-08-24 主人"手机版五幕雨滑动流畅"）：
           离屏快路径 —— 过渡带已完全滚出视口顶部（sy > hb+ps）且入场动画已播完，
           字 + 分隔 + 眉标 + 副题都已滑出（DOM 写入早在滑出时被缓存），
           此后跑 update 的 16 次元素循环是纯空转。
           第一百五十九批：常驻循环 zone 门控已在上游拦截（zone 外不跑 update），
           此处保留兜底（zone 上界 = hb+ps+400，进入缓冲带内仍可能触发）。
           滚动方向簿记在 lerp 段已完成（entryStarted 重置判定用）。 */
        if (sy > hb + ps + 1) {
          var n2 = chars.length;
          var entryWinMsChk = n2 * ENTRY_STAGGER + ENTRY_MS + TAIL_DELAY + TAIL_MS;
          var entryDoneChk = !entryStarted || (performance.now() - entryT0 >= entryWinMsChk);
          if (entryDoneChk) return;
        }

        var n = chars.length;
        var slotX = (1 - MARGIN_START - MARGIN_END) / n; /* 滑出每字窗口 0.11（桌面 220px） */
        var nowMs = performance.now();

        /* 第七十二批：登场改"滑动触发一次 + 按时间播放"——
           旧 scrub 让进场速度=滚动速度，轻轻一滑就播完看不清；
           触发点：字行进入视口底缘（eEff≥0.12）；
           第七十三批修重置：字行完全滑出视口底（hb-sy > 0.52vh，不可见）才重置可重播——
           旧阈值 eEff<0.02 时字还可见（屏底 94% 处），en 瞬间归零 = 文字"突然消失"，割裂 */
        /* 第一百五十七批：加"pin 未完全滚出视口"门控 —— 旧版滚动进入五幕雨
           （sy > hb+ps，过渡带已整体在视口上方）时 eEff 仍会爬过 0.12，触发登场
           rAF 在屏外空转 ~2s，与五屏 scrub 抢主线程；现在只有过渡带仍与视口
           相交（sy ≤ hb+ps）才触发登场。 */
        if (!entryStarted && e >= 0.12 && sy <= hb + ps + 1) { entryStarted = true; entryT0 = nowMs; }
        /* 第一百五十二批：入场动画播放期间（en 未走完）不重置 —— 刷新恢复
           scrollY 时 hb 可能因字体/图片加载短暂波动，若在播放中触发重置，
           en 冻结在中间值 = 五字半透明卡住（用户反馈"过渡带刷新卡住"）。
           重置只发生在：动画已播完（nowMs-entryT0 > 窗口）且字行滑出视口底
           且用户向上滚（scrollDir<0）——即真正离开又回来时。
           第一百五十九批：登场判定改用真实 e —— eEff（lerp 慢值）已移除，真实 e
           无滞后，常驻循环（zone 内每帧跑 update）保证触发不丢帧。 */
        var entryWinMs = n * ENTRY_STAGGER + ENTRY_MS + TAIL_DELAY + TAIL_MS;
        var entryDone = !entryStarted || (nowMs - entryT0 >= entryWinMs);
        if (entryStarted && entryDone && scrollDir < 0 && hb - sy > vh * 0.52) { entryStarted = false; }

        /* 第七十四批：向上滑回 Hero 的离场动画（位置驱动，永远与画面同步）——
           时间驱动的登场不反向播放，向上滑时字只是静止滑出屏 → "静止后突然消失"割裂。
           leave：字行进入视口底部 160px 后，随滚动淡出 + 下沉 120px（行离开视口的自然离场） */
        var lineY = hb + 0.5 * vh - sy;
        var leave = Math.min(1, Math.max(0, (lineY - (vh - 160)) / 160));

        for (var i = 0; i < n; i++) {
          var startX = MARGIN_START + i * slotX;
          /* 登场：时间驱动（固定时长 + 逐字间隔），easeOut 淡出+上浮；滑出：仍 scrub 位置驱动；
             离场（向上）：leave 淡出+下沉 */
          var en = 0;
          if (entryStarted) {
            en = easeOut(Math.min(1, Math.max(0, (nowMs - entryT0 - i * ENTRY_STAGGER) / ENTRY_MS)));
          }
          var ex = easeOut(Math.min(1, Math.max(0, (pEff - startX) / slotX)));
          var opacity = (en * (1 - ex)) * (1 - leave);
          var offset = HIDDEN_OFFSET * ((1 - en) + ex) + 120 * leave;
          /* 第一百五十七批：写缓存 + identity —— 全显（offset≈0 & opacity≈1）写
             transform:none 让字脱离合成层（配 CSS 删 will-change）；值未变跳过写入 */
          var cT, cO;
          if (Math.abs(offset) < 0.05 && opacity >= 0.999) {
            cT = 'none'; cO = '1';
          } else {
            cT = 'translate3d(0, ' + offset.toFixed(1) + 'px, 0)';
            cO = opacity.toFixed(2);
          }
          if (charT[i] !== cT) { chars[i].style.transform = cT; charT[i] = cT; }
          if (charO[i] !== cO) { chars[i].style.opacity = cO; charO[i] = cO; }
          /* 分隔符 · 跟左边的字同进退（同一 en/ex），否则字在上浮/滑出时 · 悬在原地，观感断裂 */
          if (i < seps.length) {
            /* 第一百五十九批：分隔符 identity/位移统一为 px 值 —— 原 identity 串
               'translateY(0.2em)' 为 CSS 相对值，浏览器 computed 返回 px 矩阵，
               写缓存（字符串比对）与 computed 永久不匹配，identity 脱层失效；
               现在 JS 全部写 px 值，缓存生效、REST 期 transform:none 稳定脱层。
               基线 px 只量一次（缓存 sepBasePx），滚动中零 getComputedStyle。 */
            if (sepBasePx < 0) {
              sepBasePx = parseFloat(getComputedStyle(seps[0]).fontSize) * 0.2;
            }
            if (Math.abs(offset) < 0.05 && opacity >= 0.999) {
              sT = 'translateY(' + sepBasePx.toFixed(1) + 'px)'; sO = '1';
            } else {
              sT = 'translate3d(0, ' + (sepBasePx + offset).toFixed(1) + 'px, 0)';
              sO = opacity.toFixed(2);
            }
            if (sepT[i] !== sT) { seps[i].style.transform = sT; sepT[i] = sT; }
            if (sepO[i] !== sO) { seps[i].style.opacity = sO; sepO[i] = sO; }
          }
        }

        /* 第七十一批：移除 is-resting 悬停 / is-revealed halo / 进度条（主人反馈：文字悬浮特效与
           底部进度条不好看，且应保持纯滑动触发）——滚动方向簿记已上移（lerp 段后），
           entryStarted 重置判定更及时（离屏快路径 return 前也能拿到方向） */

        /* 眉标 + 副标题：五字播完后 TAIL_DELAY 接上（时间驱动）；滑出仍最后走（p 尾段）；
           离场（向上）同 leave 淡出+下沉 */
        var tailXStart = MARGIN_START + slotX * n;
        var tEn = 0;
        if (entryStarted) {
          tEn = easeOut(Math.min(1, Math.max(0, (nowMs - entryT0 - n * ENTRY_STAGGER - TAIL_DELAY) / TAIL_MS)));
        }
        var tEx = easeOut(Math.min(1, Math.max(0, (pEff - tailXStart) / MARGIN_END)));
        var tOp = (tEn * (1 - tEx)) * (1 - leave);
        var tOffset = HIDDEN_OFFSET * 0.5 * ((1 - tEn) + tEx) + 60 * leave;
        /* 第一百五十七批：同五字 —— identity 脱层 + 写缓存 */
        var tT, tO;
        if (Math.abs(tOffset) < 0.05 && tOp >= 0.999) {
          tT = 'none'; tO = '1';
        } else {
          tT = 'translate3d(0, ' + tOffset.toFixed(1) + 'px, 0)';
          tO = tOp.toFixed(2);
        }
        if (eyebrow) {
          if (tailT.eyebrow !== tT) { eyebrow.style.transform = tT; tailT.eyebrow = tT; }
          if (tailO.eyebrow !== tO) { eyebrow.style.opacity = tO; tailO.eyebrow = tO; }
        }
        if (sub) {
          if (tailT.sub !== tT) { sub.style.transform = tT; tailT.sub = tT; }
          if (tailO.sub !== tO) { sub.style.opacity = tO; tailO.sub = tO; }
        }

        /* 时间动画播放中 → 续帧（否则停在非滚动状态时播放会冻结）
           第一百五十九批：改由常驻循环驱动 —— 标记 replayFrames 续帧 ~60 帧，
           循环尾 pickup 收走，update 内不再自发 rAF */
        if (entryStarted && nowMs - entryT0 < n * ENTRY_STAGGER + ENTRY_MS + TAIL_DELAY + TAIL_MS + 80) {
          replayFrames = 60;
        }
      }
      function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

      /* 第一百六十二批（2026-08-24 主人"我不喜欢有反弹"）：移除全部吸附回弹。
         旧 scrollend/idle → maybeSnap → smoothScrollTo 自动吸附已整体删除。
         滚动停止 → 仅刷一帧对齐显示进度（pEff lerp 残留偏移归零，五字/眉标/副题
         停在真实进度，不弹不吸）。onScroll 里仅保留 idleTimer 150ms 兜底 → idleAlign
         （供旧 Safari/Firefox），现代浏览器走原生 scrollend。 */
      var idleTimer = null;
      function idleAlign() {
        var sy = window.scrollY || window.pageYOffset;
        var ps = pinScroll(), hb = heroBottomY();
        if (sy > hb - 100 && sy < hb + ps + 100) {
          /* 常驻循环每帧已按真实 pEff 渲染；此处仅对齐一帧消除 lerp 残留（无需吸附） */
          frameNeeded = true;
        }
      }
      if ('onscrollend' in window) {
        window.addEventListener('scrollend', idleAlign);
      }
      /* 第一百五十九批：常驻单 rAF 循环 —— scroll/wheel/resize 只改 dirty 标志，
         循环每帧 pickup 收走脏帧并跑 update。update 帧率 = 显示屏帧率（不再被
         scroll 事件频率拖累），桌面滚轮/触摸板双平滑（wheel lerp + pEff lerp）
         每帧跟进消拖尾，移动端原生惯性滚动每帧同步。zone 外（且无入场动画
         待播）只清 dirty 直接返回，零渲染开销；入场动画期间 replayFrames>0
         保证 zone 内持续每帧更新（否则停在非滚动状态时播放会冻结）。 */
      var dirty = true;
      var frameNeeded = false;
      var replayFrames = 0;
      var rafDt = 0;

      function loop(now) {
        requestAnimationFrame(loop);
        var sy = window.scrollY || window.pageYOffset;
        var vh = window.innerHeight || document.documentElement.clientHeight;
        var hb = heroBottomY();
        var ps = pinScroll();
        var zone = sy > hb - vh * 0.8 - 400 && sy < hb + ps + 400;
        var need = dirty || frameNeeded || replayFrames > 0;
        if (replayFrames > 0) replayFrames--;
        frameNeeded = false;
        if (!need) return;
        if (!zone) { dirty = false; return; }
        rafDt = (now - (loop.last || now)) / 1000;   /* ms → s，update 当秒用 */
        loop.last = now;
        update();
      }

      function onScroll() {
        dirty = true;
        /* 无 scrollend 的浏览器（旧 Safari/Firefox）：150ms 无 scroll 事件 → 对齐一帧 */
        if (!('onscrollend' in window)) {
          clearTimeout(idleTimer);
          idleTimer = setTimeout(idleAlign, 150);
        }
      }
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      /* 2026-08-19 修复"Cmd+R 刷新丢失"(同 vslides):
         刷新静默恢复 scrollY 不触发 scroll → 首帧 cachedHbY 若在 hero 未就绪时测量则偏小
         → p 偏大 → 过渡带五字全滑出/眉标副题消失,且 hbImg complete 后 invalidateHbY 只清缓存
         不重测 → 永久卡错位。window load(资源终态) → 失效缓存 + 立即重算一帧修正。
         第一百五十二批（2026-08-23 主人"过渡带刷新页面卡住"）：
         刷新恢复 scrollY 到过渡带时，入场触发原本依赖 eEff（lerp 慢值）≥0.12，
         而 eEff 爬升需要滚动驱动的 rAF 续帧 —— 刷新恢复不触发 scroll → 死锁，
         entryStarted 永不触发、五字永远透明。load 兜底用【真实 e】直接判定并
         强制从头播（重置 entryT0），不依赖 lerp 链路；入场动画的 rAF 续帧
         （update 末尾条件）会持续到播放完。配合两处防护（见 update 内）：
         dt 下限 1ms（防同帧并发 update 的 vel 溢出 → NaN）+ entryDone 守卫
         （播放中不重置，重置只发生在播完且用户向上滚时）。 */
      window.addEventListener('load', function () {
        invalidateHbY();
        invalidatePS();
        first = true;
        var syL = window.scrollY || window.pageYOffset;
        var hbL = heroBottomY();
        var vhL = window.innerHeight || document.documentElement.clientHeight;
        var entryWindowL = vhL * 0.45;
        var eReal = Math.min(1, Math.max(0, (syL - (hbL - entryWindowL)) / entryWindowL));
        /* 第一百五十七批：刷新位置在五幕雨（syL ≤ hbL+psL）才强制登场 ——
           刷新落在五屏内（过渡带已滚过）不播屏外空转的入场动画 */
        var psL = pinScroll();
        if (eReal >= 0.12 && syL <= hbL + psL + 1) {
          /* 刷新位置在字行进入视口之后 → 强制触发 + 重置 entryT0 从头播，
             保证五字完整登场 */
          entryStarted = true;
          entryT0 = performance.now();
        } else {
          entryStarted = false;
        }
        dirty = true;
      });

      /* 启动常驻循环（首帧 dirty=true 会立即渲染一帧修正刷新位置） */
      requestAnimationFrame(loop);
    })();

    /* 第一百三十七批（2026-08-21 主人"背景样式保持不变（若已误改请回退至原版）"）：
       移除第一百三十三/一百三十六批加的"滚动时暂停/降帧率背景 canvas"逻辑 ——
       canvas-nest.js / canvas-ribbons.js 已回退原版（git checkout 257d081），
       背景动画恢复常驻 rAF（原版行为）；canvas 的 pause()/resume() 仅由自身
       visibilitychange（切后台）使用。移动端滚动流畅改由原生滚动 + vslide 引擎
       优化（p 缓存 / touch 禁 blur）承担。 */
