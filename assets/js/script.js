    /* === Lenis 平滑滚动（第六十三批接入 / 第六十七批限定区域）===
       仅 .story-pin（落眸笑歌触）区域启用 Lenis 惯性；hero 等区域保持原生滚动触感。
       门控方式：滚动位置 sy >= hb（过渡带顶进入视口顶）→ smoothWheel 开，否则关。
       （prevent 回调逐元素检查，路径含 MAIN/BODY 等祖先会误拦截，弃用）
       touch 保持原生（syncTouch:false）；lenisOn 时过渡带自研 lerp 让位（防双重平滑）。 */
    var lenisOn = false;
    (function () {
      /* 仅桌面（hover + fine pointer）启用：Lenis 惯性滚动面向 wheel/触控板；
         触屏保持原生 + 过渡带自研 lerp（syncTouch:false 时 Lenis 不管触屏，硬启用会让移动端快滚失去拖尾保护） */
      if (typeof window.Lenis === 'undefined') return;
      try {
        if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
        var l = new window.Lenis({ lerp: 0.1, syncTouch: false, smoothWheel: false });
        window.__lenis = l;
        lenisOn = true;
        (function raf(t) {
          l.raf(t);
          requestAnimationFrame(raf);
        })(0);
      } catch (e) { lenisOn = false; }
    })();

    var navEl = document.getElementById('nav');
    var btn = document.getElementById('hamburgerBtn');
    var menu = document.getElementById('navMenu');
    var closeBtn = document.getElementById('navMenuClose');
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
      var accent = null;
      try { accent = getComputedStyle(document.documentElement).getPropertyValue('--color-accent-rgb').trim(); } catch (e) {}
      if (accent) {
        var rgb = accent.replace(/\s+/g, '');
        if (window.RainNest) { window.RainNest.setColor(rgb); }
        if (window.RainRibbons) { window.RainRibbons.setColor(rgb); }
      }
      /* hero 标题颜色走 CSS 变量 --color-accent，主题切换自动变色，无需 JS 联动 */
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
      function syncHeroAnchor() {
        if (anchorTicking) return;
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
      syncHeroAnchor();
      window.addEventListener('resize', syncHeroAnchor);
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(syncHeroAnchor);
      }
      /* 图片加载完成（intrinsic 尺寸确定）后再校一次，防 aspect-ratio 计算误差 */
      if (artCard) {
        var img = artCard.querySelector('img');
        if (img) {
          if (img.complete) { syncHeroAnchor(); }
          else { img.addEventListener('load', syncHeroAnchor); }
        }
      }

      /* --- 打字机：几句雨猫主题句子循环播放 --- */
      var typeEl = document.getElementById('typewriter');
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

      /* --- 时钟：时间 + 日期 + 安安问候（本地实时）
         中文页面（html lang 以 zh 开头）一律用中文日期时间格式（24h 制），
         非中文页面才跟随设备语言；时区始终用设备本地时间 --- */
      var timeEl = document.getElementById('heroTime');
      var dateEl = document.getElementById('heroDate');
      var greetEl = document.getElementById('heroGreet');
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
        function tickClock() {
          var now = new Date();
          timeEl.textContent = timeFmt.format(now);
          dateEl.textContent = dateFmt.format(now);
          if (greetEl) greetEl.textContent = greetFor(now.getHours());
        }
        tickClock();
        setInterval(tickClock, 1000);
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

      /* --- 照片按压反馈（mousedown 压扁 / mouseup 弹簧回弹）：
         按下：60ms 快速压扁 scale(0.97) 并保持（fill: forwards）；
         松开：单帧回弹 + back 缓动曲线（cubic-bezier(0.34,1.56,0.64,1)）——
         过冲由曲线自身产生（y>1 的 overshoot），不手写关键帧（逐帧反而卡顿不自然）。
         规范依据：gesture-responses —— press 50ms 内响应、release 150-300ms + overshoot。
         mouseup 绑在 window 上 → 卡片内外任何位置松开都触发回弹；
         故意不挂 mouseleave：拖出元素时按钮未释放，不应提前回弹
         （之前 mouseleave 等同松开 → 用户拖到外面还在按，卡就先回弹了，动画"奇怪"）。
         位移/缩放读 --lift/--scale 变量（hover 提供），保持 hover 态一致 */
      /* 复用外层 IIFE 顶部已声明的 artCard（line 231，hero.querySelector('.hero-art-card')），
         这里不再重新 querySelector 同一个元素 —— 重构搬块时漏删的 var 声明 */
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
          var tilt = readVar('--tilt', '-2deg');
          return 'rotate(' + tilt + ') translateY(' + lift + ') scale(' + scaleVal + ')';
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
        /* 移动端（pointer: coarse）完全不挂 press 监听——浏览器原生接管：
           点击无视觉反馈、长按弹系统菜单（iOS 弹"存储图像/拷贝/分享"，
           Android Chrome 弹"保存图片/搜索"）。CSS 同步移除 -webkit-touch-callout
           让 iOS 长按菜单恢复。
           桌面端保留 mousedown 压扁/回弹：鼠标 hover/click 是桌面交互的核心反馈。
           2026-08-17 第五十一批 */
        var isCoarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        if (!isCoarsePointer) {
          artCard.addEventListener('mousedown', pressDown);
          window.addEventListener('mouseup', releaseUp);
        }
      }
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
           第六十批新增丝滑跟随：eEff/pEff lerp 惯性逼近 e/p（滚动中拖尾丝滑）+ 每字 easeOut 缓动；
           第六十一批：停止 150ms 直接平滑吸附回全显或到底（不先收敛冻结），动画全程连续；
           第六十二批：帧率无关 + 速度自适应跟随；第六十三批：接入 Lenis 全局平滑——
           lenisOn 时过渡带跟随让位（防双重平滑），无 Lenis 自动回退自研 lerp；
           第六十六批：UX 检查发现瞬跳/键盘下字会冻结在 lerp 滞后态——
           onIdle 启动短 rAF settling 循环让 lerp 收敛到稳定态（字随惯性平滑到位），再触发吸附）
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
      var ticking = false;
      var HIDDEN_OFFSET = 120;   /* 字进场/滑出的最大位移（px），从下方来、往下方去 */
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

      /* 丝滑跟随（第六十三批）：lenisOn 时显示进度=滚动进度（惯性由 Lenis 承接，避免双重平滑）；
         无 Lenis 时回退自研：帧率无关指数平滑 + 速度自适应（快滚松、慢滚紧） */
      var eEff = 0, pEff = 0, first = true;
      var idleTimer = null, snapping = false, lastSnap = 0, settling = false;
      var lastSy = -1, lastT = 0, vel = 0;   /* 滚动速度 EMA（px/s），驱动自适应跟随 */
      /* 滚动方向（-1=上 / 0=静止 / 1=下），maybeSnap 据此判断吸附意图 */
      var scrollDir = 0;

      /* 与 .story-pin 高度配套：读 CSS 变量，改 CSS 一处即可（桌面 900px / 移动 720px） */
      function pinScroll() {
        var v = 900;
        if (pin) {
          try {
            var raw = getComputedStyle(pin).getPropertyValue('--pin-scroll').trim();
            if (raw) v = parseFloat(raw) || 900;
          } catch (e) {}
        }
        return v;
      }

      function heroBottomY() {
        if (!hero) return 0;
        var r = hero.getBoundingClientRect();
        return r.bottom + (window.scrollY || window.pageYOffset);
      }

      function update() {
        ticking = false;
        var sy = window.scrollY || window.pageYOffset;
        var hb = heroBottomY();
        var vh = window.innerHeight || document.documentElement.clientHeight;
        var ps = pinScroll();

        /* 第六十七批：Lenis 平滑门控——仅过渡带区域（sy>=hb，五字目录顶进入视口顶）启用；
           hero 等区域 smoothWheel=false → 原生滚动触感 */
        if (window.__lenis) {
          window.__lenis.options.smoothWheel = sy >= hb;
        }

        /* 进场进度 e（第七十二批起只作"触发点"用）：e≥0.12 触发登场时间动画，e<0.02 重置可重播。
           窗口 0.45vh 定位字行进入视口的时刻（第六十八批：旧 0.8vh 让前两字淡入跑屏外） */
        var entryWindow = vh * 0.45;
        var e = Math.min(1, Math.max(0, (sy - (hb - entryWindow)) / entryWindow));
        /* 滑出进度 p：pin 内滚动（scrollY 从 hb 到 hb+ps）
           p=0 全显示 → p=1 全滑出（sticky 释放） */
        var p = Math.min(1, Math.max(0, (sy - hb) / ps));

        /* 丝滑跟随：lenisOn → 直接对齐（惯性由 Lenis 的滚动平滑承接，不双重平滑）；
           否则回退自研 lerp（帧率无关 + 速度自适应） */
        if (lenisOn) {
          eEff = e; pEff = p;
        } else {
          var now = performance.now();
          var dt = lastT ? (now - lastT) / 1000 : 1 / 60;
          lastT = now;
          if (lastSy >= 0) {
            vel += (((sy - lastSy) / dt) - vel) * 0.2;
          }
          lastSy = sy;
          if (first) { eEff = e; pEff = p; first = false; }
          var k = Math.max(0.07, Math.min(0.3, 0.3 - vel / 11000));
          var kf = 1 - Math.pow(1 - k, Math.min(3, dt * 60));
          eEff += (e - eEff) * kf;
          pEff += (p - pEff) * kf;
          /* settling：滚动停下后的短收敛循环（防瞬跳/键盘冻结），收敛完触发吸附 */
          if (settling && Math.abs(e - eEff) < 0.01 && Math.abs(p - pEff) < 0.01) {
            settling = false;
            maybeSnap(p);
          } else if (settling) {
            ticking = true;
            requestAnimationFrame(update);
          } else {
            if (Math.abs(e - eEff) < 0.002) eEff = e;
            if (Math.abs(p - pEff) < 0.002) pEff = p;
          }
        }

        var n = chars.length;
        var slotX = (1 - MARGIN_START - MARGIN_END) / n; /* 滑出每字窗口 0.11（桌面 220px） */
        var nowMs = performance.now();

        /* 第七十二批：登场改"滑动触发一次 + 按时间播放"——
           旧 scrub 让进场速度=滚动速度，轻轻一滑就播完看不清；
           触发点：字行进入视口底缘（eEff≥0.12）；
           第七十三批修重置：字行完全滑出视口底（hb-sy > 0.52vh，不可见）才重置可重播——
           旧阈值 eEff<0.02 时字还可见（屏底 94% 处），en 瞬间归零 = 文字"突然消失"，割裂 */
        if (!entryStarted && eEff >= 0.12) { entryStarted = true; entryT0 = nowMs; }
        if (entryStarted && hb - sy > vh * 0.52) { entryStarted = false; }

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
          chars[i].style.transform = 'translate3d(0, ' + offset.toFixed(1) + 'px, 0)';
          chars[i].style.opacity = opacity.toFixed(2);
          /* 分隔符 · 跟左边的字同进退（同一 en/ex），否则字在上浮/滑出时 · 悬在原地，观感断裂 */
          if (i < seps.length) {
            seps[i].style.transform = 'translate3d(0, calc(0.2em + ' + offset.toFixed(1) + 'px), 0)';
            seps[i].style.opacity = opacity.toFixed(2);
          }
        }

        /* 第七十一批：移除 is-resting 悬停 / is-revealed halo / 进度条（主人反馈：文字悬浮特效与
           底部进度条不好看，且应保持纯滑动触发）——保留滚动方向供 maybeSnap 判断 */
        if (lastSy >= 0 && sy !== lastSy) { scrollDir = sy > lastSy ? 1 : -1; }

        /* 眉标 + 副标题：五字播完后 TAIL_DELAY 接上（时间驱动）；滑出仍最后走（p 尾段）；
           离场（向上）同 leave 淡出+下沉 */
        var tailXStart = MARGIN_START + slotX * n;
        var tEn = 0;
        if (entryStarted) {
          tEn = easeOut(Math.min(1, Math.max(0, (nowMs - entryT0 - n * ENTRY_STAGGER - TAIL_DELAY) / TAIL_MS)));
        }
        var tEx = easeOut(Math.min(1, Math.max(0, (pEff - tailXStart) / MARGIN_END)));
        var tOpacity = ((tEn * (1 - tEx)) * (1 - leave)).toFixed(2);
        var tOffset = HIDDEN_OFFSET * 0.5 * ((1 - tEn) + tEx) + 60 * leave;
        if (eyebrow) {
          eyebrow.style.transform = 'translate3d(0, ' + tOffset.toFixed(1) + 'px, 0)';
          eyebrow.style.opacity = tOpacity;
        }
        if (sub) {
          sub.style.transform = 'translate3d(0, ' + tOffset.toFixed(1) + 'px, 0)';
          sub.style.opacity = tOpacity;
        }

        /* 时间动画播放中 → 持续 rAF（否则停在非滚动状态时播放会冻结） */
        if (entryStarted && nowMs - entryT0 < n * ENTRY_STAGGER + ENTRY_MS + TAIL_DELAY + TAIL_MS + 80) {
          ticking = true;
          requestAnimationFrame(update);
        }
      }
      function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

      /* 滚动停止（含惯性结束）150ms → 启动短 rAF 收敛循环（防瞬跳/键盘冻结），
         收敛到稳定态后由 settling 分支触发吸附（字随 lerp 平滑到位，非冻结） */
      function onIdle() {
        settling = true;
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
      }

      /* 停在坏位置（滑出中段，五字半残）→ 平滑吸附回全显（p<0.6）或滑到底 */
      function maybeSnap(p) {
        var now = Date.now();
        if (snapping || now - lastSnap < 1000) return;
        if (p <= MARGIN_START) return;                /* 驻留区：五字全显，不动 */
        if (p >= 1 - MARGIN_END * 0.5) return;        /* ≥0.925：接近结束，不动 */
        lastSnap = now;
        snapping = true;
        var hbY = heroBottomY(), psV = pinScroll();
        /* 第七十批：滚动方向决定吸附意图
           - scrollDir === -1（向上滚）→ 始终回到驻留（用户想回去看五字）
           - scrollDir === 1 且过半（p > 0.55）→ 滑到底（用户已深入，惯性继续）
           - scrollDir === 1 且未过半 → 回驻留（用户只是试探，应回到五字完整态）
           - scrollDir === 0（静止）→ 回驻留（默认安全方向） */
        var goDown = (scrollDir === 1) && (p > 0.55);
        var target = goDown ? (hbY + psV) : hbY;
        /* 整体速度统一（第六十五批）：回弹时长 ∝ 距离/常速（~1600px/s，与滑出节奏同频），
           不再固定 0.55s——短距离快速到位、长距离从容不赶；
           easeInOut 平滑起止（easeOut 起步即全速，从静止突然加速是"割裂"感的来源之一） */
        var curY = window.scrollY || window.pageYOffset;
        var dist = Math.abs(target - curY);
        var dur = Math.max(0.25, Math.min(0.7, dist / 1600));
        if (window.__lenis) {
          window.__lenis.scrollTo(target, {
            duration: dur,
            easing: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
          });
        } else {
          window.scrollTo({ top: target, behavior: 'smooth' });
        }
        function done() {
          snapping = false;
          /* 吸附结束后对齐一次显示进度，避免 lerp 残留偏移 */
          if (ticking) return;
          ticking = true;
          requestAnimationFrame(update);
        }
        if ('onscrollend' in window) {
          window.addEventListener('scrollend', done, { once: true });
        } else {
          setTimeout(done, 900);
        }
      }

      function onScroll() {
        /* 吸附回弹期间不重排 idle */
        if (!snapping) {
          clearTimeout(idleTimer);
          idleTimer = setTimeout(onIdle, 150);
        }
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
      }
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      update();
    })();