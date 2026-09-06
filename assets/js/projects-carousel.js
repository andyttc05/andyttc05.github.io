/* 项目页 · Skewed Carousel（第一百八十批起；第一百九十三批 2026-08-26 重写引擎；
   第二百零四批 2026-08-29 主人"循环显示，卡片不够时一个画面可以重复显示"）——
   原生实现 React Bits Pro Skewed Carousel 同款效果（站点零第三方依赖）：
   - 核心机制：整条卡片带用单一连续偏移 x（px）驱动，每张卡的 rotateY / scale 是
     x 的连续函数 —— 切换/滚动过程中卡片持续倾斜+缩放（连续轨道偏移，非离散档位）。
   - 槽位模型（第二百零四批）：不是"n 张卡在环里移动"（4 卡环静止必然空一个 ±2 槽、
     左右不对称，主人"怎么只有右边有+2"），改为"无限槽位"——
       每个整数槽位 j 固定在 j·step+x 处，持有卡 PROJECTS[wrapIdx(j)]，
       序列 A B C D A B C D… 无限循环；一屏 5 槽 [-2..+2] 显示 [C D A B C]，
       ±2 槽对称重复同一张 C（主人"一画面可重复显示"）；
       滑动时槽位从边缘进出，元素池回收复用（出界回池、进界取用，换卡时更新图片）。
       无回绕瞬移 —— 循环感来自槽位无限，而不是卡片跳边。
   - 每帧计算（t = 槽位距中心步数，连续）：
       rotateY 曲线（第一百九十七批，主人"±2 卡与±1 反向"）：带符号连续 —
         ±1 朝中心 60°、过 1.5 档归平、±2 朝外 45°，扇形交替，两侧对称；
         perspective 1400 下正反面不翻转、正面始终可见
       scale  = 1 → 0.85          按 |t| 线性过渡到非活动缩放（inactiveScale）
       opacity：|t|≤2 全不透明（±2 可见），[2,3] 线性 1→0（缓冲槽入环平滑）
       ease：临界阻尼弹簧 K=240/C=31（第二百一十批：太弹 → 弹簧物理 ζ≈1.0，
       单调无过冲、继承滑行速度、仿真 400~520ms 归位）
   - 透视：.skewed-strip 上 perspective: 1400px。
   - 交互（第二百批起无底部栏）：pointer 横向拖拽 / 键盘 ←→ / 滚轮纵向滚动。
       第二百零五批 吸附/回弹物理化（网上调研 Flickity / Swiper free-mode /
       GSAP inertia 的主流做法）：松手先按释放速度惯性滑行（指数摩擦 ~0.87/帧），
       速度低于阈值或超时后再弹到最近档位；吸附时长按剩余距离缩放
       （[150, 380]ms）。第二百零六批（主人"丝滑一点，延迟太多"）：easeOutBack
       过冲与 600ms 上限在收尾时反向拉动、体感延迟 —— 改 easeOutQuart 纯减速、
       时长上限 380ms、滚轮吸附 110ms、滑行摩擦 0.93→0.87（更快停稳）。
       第二百零八批（主人"动效要优雅一点"）：旋转/缩放折线改 smoothstep 插值
       （分段点斜率归零、无变速顿挫）；滚轮改"目标累积 + 每帧指数逼近"渲染
       （离散跳变平滑成连续滑行）。
       第二百一十批（主人"好像有点太弹了"）：吸附改临界阻尼弹簧 K=240/C=31
       （ζ≈1.0，单调无过冲、继承滑行速度）。
       第二百一十一批（主人"滚轮滑动卡片"问题）：滚轮改离散档位步进 ——
       "自由滑+吸附"在单档不足半卡时被弹簧拽回原位、滚轮像没反应；
       现累积 deltaY ≥60px 步进一卡（上限 3 档/次、90ms 冷却）。
       第二百六十一批（2026-08-29 主人"咔哒一格一格 / 触控板不丝滑"）：
       滚轮/触控板改回连续跟手（0.9 逼近，同拖拽），停滚平滑吸附最近档位 ——
       无咔哒、滑动全程卡片持续倾斜缩放；轮播区滚轮 stopPropagation，
       不与整页平滑滚动叠加。
   数据：PROJECTS 数组（4 张图片卡，图在 assets/images/projects/；n<5 时一屏
   自动重复，n≥5 时一屏全唯一）。
   第二百六十三批 2026-09-05（主人"自动轮动卡片动画太快"）：
   - 舒缓展示系数 AUTO_K=0.15（≈0.45~0.5s 优雅减速滑到中心，倾斜/缩放动效
     全程可见）：自动轮播切换、点击侧卡居中、键盘 ←→ 统一使用
     （同批追加 主人"点击页面的动画和自动轮播一样"）
   - 拖拽松手吸附/停滚吸附保留 0.6（直接操作要干脆）；拖拽跟手 0.9 不变
   - 帧率无关化：逐帧逼近系数 k 按距上帧时间折算回 60Hz 基准 —— 此前在
     120Hz 屏上动画实际快一倍（这也是"太快"观感的一大来源）。
   第二百六十四批 2026-09-05（主人"连续滑动有时会卡住"）：
   - 拖拽态失联死锁修复：pointerup 在窗口外丢失会让 dragging 永久 true ——
     滚轮整段被丢、自动轮播被 autoStart 闸挡 = 死机。滚轮/键盘/blur/
     visibilitychange 时强制 resetDrag() 接管
   - stopTick() 统一中止吸附动画并清 lastFrameT —— 慢动画被打断后重启
     tick 不再因陈旧时间戳算超大 dtF 而瞬移/跳帧
   第二百六十五批 2026-09-06（主人"快速连续点击卡片卡住"，真机复现）：
   - 复现链条：慢滑 0.5s 期间连点侧卡，卡在按住间隙漂进中心区 →
     松开瞬间 |t|≤0.5 且带 link → 误判"点主卡"→ window.open 弹 GitHub
     tab 抢焦点 → 原 tab 隐藏、rAF 挂起 → 卡片冻结半程，后续点击全失效
   - 修复：弹窗判定改为按下瞬间数据 —— (1) u 用 pointerdown 时刻；
     (2) 仅当按下时条带静止（tapWasAnimating=false）才允许开链接；
     滑行中点击一律居中不弹窗（刻意点静止主卡仍正常开）
   - 兜底：visibilitychange 恢复可见时若动画停在半程且 rAF 断 → 续跑 tick
   第二百六十六批 2026-09-06（主人"快速点击还是会卡住"，真机复现 chaseCard）：
   - 265 批只挡"滑行中点击"，挡不住"慢滑结束后追点同一张已静止居中的 repo 卡"
     （间隔 350~800ms 的连点簇）—— 追点落在 u≤0.5 且静止的主卡上仍误弹窗
   - 加"孤立点击"闸：距上次轮播交互（pointerdown/键盘/滚轮）≥800ms 才允许
     window.open；连点簇一律只居中。pointerdown/keydown/wheel 统一打 lastInputT
   第二百六十七批 2026-09-06（主人"还是不行 → 快速点击 +1/+2 连续移动不流畅"，
   真机 20ms 采样实锤 stop-go）：
   - 真症状不是弹窗/死锁，是"不流畅"：pointerdown 无条件 stopTick 把每次
     快速点击变成 按下硬停 67~83ms → 松开重启 —— stop-go 一顿一顿 = 卡住观感
   - 修：按下不再打断进行中的滑行（点击只改目标，动画连续逼近）；动画只在
     真拖动（>8px）接管处 stopTick（264 批的陈旧时间戳修复保留在接管处）
   第二百六十八批 2026-09-06（主人"优化鼠标拖拽移动卡片的滑动手感 → 拖动更贴手"）：
   - 拖动逼近 0.9 → 0.95（60Hz 基准）：快甩稳态滞后减半
   - dragTick 帧率无关化：按 rAF 时间戳折算 dtF（全文件最后一个未折算的动画循环，
     此前 120Hz 屏收敛快一倍）；重起循环清 dragLastT
   - 松手吸附仍 0.6 干脆收尾、甩动仍最多一档 —— 未动
   第二百六十九批 2026-09-06（主人追问"一样很奇怪" → 快速甩动不流畅 + 松手动画
   奇怪）：
   - 接管吞位移：engage 不再把 dragStartX 重基线到当前指针（吞掉 down→engage 间
     30-60px 快速甩动首段）—— 指针位移始终从按下点计，甩动 1:1 跟手
   - 松手落位改临界阻尼弹簧（ζ=1，w=11，~0.3s 单调无过冲）：替代指数急吸 0.6
     —— 后者从静止起步、按距离跳首帧（速度断裂 = "松手动画奇怪"）；
     弹簧继承 dragTick 实测卡片速度（px/s），甩得快自然更早到、速度全程连续
   - 弹簧可被任意后续操作接管（stopTick/animateTo 清 SPRING，不打断原则不变）
   第二百七十批 2026-09-06（主人"为什么现在+1/+2卡片不能点击"）：
   - 真机复现（10px 低速抖动点击 +1 卡 → 弹回原位）：真实鼠标按下瞬间普遍带
     8~30px 抖动，超过 8px 拖拽接管阈值即被当"拖动"；低速松开又按"未过半档"
     弹回 → 卡片纹丝不动 = 点击完全没反应（此前自动化测试用零抖动合成点击，
     永远测不出来）
   - 修：点击判定从"moved≤6 且低速"放宽为"未拖远（≤CLICK_SLOP=24px）且
     松手速度 <0.5px/ms"一律按轻点处理，居中按下时的卡；真拖/高速轻甩不受影响
   第二百七十一批 2026-09-06（主人"优化触控板滑动的手感，和结束滑动的动画"）：
   - AskUser：不满意点 = 结束停下的动画；风格选"舒缓 ~0.35s"（推荐项）
   - 停滚落位改临界阻尼弹簧（startSpring 通用化，ω=18）：替代指数急吸 0.6 ——
     后者 ≈0.1s 从静止起步、按剩余距离跳首帧（速度断裂 = 硬停突兀）；弹簧从
     0 速度平滑加速-减速单调落位 ~0.35s（点击/自动 0.5s 与拖拽松手 0.25s
     之间的中间语感），与全站动画语言统一
   - deltaMode 归一化：line×20 / page×step —— Safari 物理滚轮常报 line 模式
     （deltaY≈1-3 行），原样累加几乎不动；触控板恒为 pixel 模式不受影响
   - 滑动跟手（0.9 逼近、120ms 停滚判定）未动 —— 主人未反馈该段问题
   第二百七十二批 2026-09-06（主人"拖动停在卡片中间会跳动下一个卡片"，真机复现
   drag-stop.js faststop：快移 90px<半档、停 90ms 才松手 → 仍跳下一张）：
   - 释放速度判定改"尾速"：只用松手前 ≤40ms 采样，且 40ms 内无新采样=已停稳
     vel=0 —— 旧取 velSamples 首尾（100ms 窗）不查新旧，快速拖动后停住的
     松手会被算成高速 = 误判轻甩 → 停半路却跳卡；真轻甩（移完即松手）不受影响
   - dragTick 收敛退出时 dragVel 清零 —— 旧冻结在末帧高速，松手弹簧继承陈旧
     初速（"停住还往前冲"次生来源）；spring v0 从此只来自仍在追手的真实速度
   - 顺带修潜伏 bug：tapSlotJ=-1 兼任"未命中"哨兵，而槽位 j 可为负（auto 前进
     后中心 -1、-2…）→ 点侧卡偶发完全失灵。拆出 tapHit 布尔，负槽位不再被
     `j>=0` 挡在点击分支外 */
(function () {
  var root = document.getElementById('skewedCarousel');
  if (!root) return;
  var strip = root.querySelector('.skewed-strip');

  /* === 项目数据（第二百批：图片卡，bg 由 p.img 全图覆盖；no/title 覆盖在图上）
     2026-08-30 接入真实项目：前两张为真实 GitHub 仓库（link 可点跳转，desc 副标题），
     后两张为「建设中」占位（标题「正在建设中」）；
     四张卡背景沿用现有四张角色图，不新增图片。 === */
  var PROJECTS = [
    { no: '01', title: 'my-first-repo', desc: '学习 Git & GitHub 的第一个仓库', img: 'https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/projects/castorice.webp?v=1', link: 'https://github.com/andyttc05/my-first-repo' },
    { no: '02', title: 'andyttc05.github.io', desc: '个人网站 · 你正看着的这个站点', img: 'https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/projects/hyacine.webp?v=1', link: 'https://github.com/andyttc05/andyttc05.github.io' },
    { no: '03', title: '正在建设中', img: 'https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/projects/evernight.webp?v=1', wip: true },
    { no: '04', title: '正在建设中', img: 'https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/projects/cyrene.webp?v=1', wip: true }
  ];

  /* 几何参数（读 CSS 变量，resize 重算；第二百批卡片加大：240 / gap 32，移动端 160 / 16） */
  var W = 240, G = 32, ROT = 60, SC = 0.85;
  function measure() {
    var cs = getComputedStyle(root);
    W = parseFloat(cs.getPropertyValue('--sc-card-w')) || 240;
    G = parseFloat(cs.getPropertyValue('--sc-gap')) || 32;
    ROT = parseFloat(cs.getPropertyValue('--sc-rot')) || 60;
    SC = parseFloat(cs.getPropertyValue('--sc-scale')) || 0.85;
  }
  function step() { return W + G; }

  var n = PROJECTS.length;
  var slots = [];           /* 活动槽位 {j, el} */
  var pool = [];            /* 空闲元素池 */
  var RENDER_RANGE = 3.5;   /* 单位：step —— 覆盖静止 ±2 + 过渡 ±2.5 + 边缘缓冲 */
  /* 点击命中阈值（修复"连点 +2 卡不连续"）：连点 +2 时第二次点击常落在动画中途，
     命中卡 u ∈ (2.05, 2.44]，原 2.05 阈值把它当边缘缓冲卡忽略 → 连点只走一格。
     +1 卡中途命中 u≈1.2-1.8 不受影响；几何上包含 +2 光标点的卡 u 最大 2.44，
     u=3 才透明度归零 —— 3.0 覆盖全部可见/半透明卡，且不误伤不可见卡。 */
  var CLICK_MAX_U = 3.0;
  /* 第二百七十批（主人"为什么现在+1/+2卡片不能点击"）：点击抖动容差 ——
     真实鼠标按下瞬间普遍带 8~30px 位移（按键压力/手抖），一旦超过 8px 拖拽接管
     阈值就被当成拖动；低速松开又按"未过半档"弹回原位 → 卡片纹丝不动，观感
     "点不动"。按下未拖远（≤CLICK_SLOP）且松手速度低（<0.5px/ms）= 抖动点击，
     一律居中按下时的卡；真拖（>24px）或高速轻甩（≥0.5px/ms）不受影响。 */
  var CLICK_SLOP = 24;
  var x = 0, xTarget = 0;   /* 轨道连续偏移（px），无界单增 */
  var raf = null;
  var tapSlotJ = -1;   /* 第二百三十二批：pointerdown 时命中的槽位（点击的具体副本） */
  var tapHit = false;  /* 第二百七十二批：命中标志 —— 槽位 j 可为负（auto 前进后中心
                          即 -1、-2…），旧代码用 tapSlotJ=-1 兼任"未命中"哨兵会把合法
                          负槽位挡在点击分支外（观感：连点/点侧卡偶尔完全没反应） */
  /* 第二百六十五批：连点冻结 —— 弹窗判定需按下瞬间数据 */
  var tapU = -1;              /* pointerdown 命中卡的距中心步数 u（当时刻） */
  var tapWasAnimating = false; /* pointerdown 时是否有动画在跑（滑行中点击 ≠ 刻意点主卡） */
  var lastInputT = 0;         /* 第二百六十六批：最近一次轮播交互时刻（pointerdown/键盘/滚轮），
                                 供"孤立点击才开链接"判定 —— 快速连点簇一律只居中不弹窗 */
  var tapInputGap = 1e9;      /* 本击距上次交互的间隔（pointerdown 时刻先取旧值再盖新戳，
                                 endDrag 用此值判定孤立 —— 若 down 后更新再取会恒 ≈0ms，
                                 误杀刻意点主卡开链接） */
  var OPEN_IDLE_GATE = 800;   /* 距上次交互 ≥800ms 才视为刻意点主卡（允许 window.open）；
                                 慢滑 0.5s 结束后追点同一张卡（间隔 350~800ms）会被此闸拦住 */
  var dragging = false, dragStartX = 0, dragBaseX = 0;
  var dragEngaged = false;   /* 第二百三十一批：拖动是否真正开始（位移 >8px） */
  var dragTarget = 0, dragRaf = null;   /* 拖动目标 + rAF 平滑循环（第二百五十九批恢复） */
  var dragLastT = 0;          /* 第二百六十八批：拖动循环帧率无关化 —— rAF 时间戳折算 60Hz */
  /* 第二百六十九批：dragTick 逐帧测卡片实际速度（px/s），供松手弹簧继承初速度 */
  var dragVel = 0, dragPrevX = NaN, dragPrevT = 0;
  var velSamples = [];        /* 拖拽期最近 ≤100ms 采样（{t, x}），用于松手释放速度 */

  function wrapIdx(i) { return ((i % n) + n) % n; }

  /* 预加载全部卡图：槽位复用换图时浏览器缓存秒切，不闪白；decode() 提前解码 ——
     回弹/步进时新卡入环不再触发"解码抖动"（第二百二十四批 主人"回弹有时像卡住"） */
  PROJECTS.forEach(function (p) {
    var im = new Image();
    im.src = p.img;
    if (im.decode) im.decode().catch(function () {});
  });

  /* 逐帧渲染：遍历当前可见槽位 [jmin, jmax]，出界回池、进界取用，
     每槽按距中心连续距离写 transform/opacity/z-index */
  function render() {
    var st = step();
    /* 第二百四十批（主人"怎么还有回弹动画"）：移除内容滞后动效（Follow-through）——
       之前卡片框到位后，图片/文字层还要相对框滞后"跟上"（±6px），动画收尾表现
       为轻微回弹晃动，正是"回弹动画"观感的来源。现在整卡（框+内容）一体运动、
       到位即停。顺带清除池复用元素上的旧行内 transform/will-change 残留。 */
    for (var s2 = 0; s2 < slots.length; s2++) {
      if (slots[s2].media.style.transform !== '') slots[s2].media.style.transform = '';
      if (slots[s2].inner.style.transform !== '') slots[s2].inner.style.transform = '';
      if (slots[s2].media.style.willChange !== '') slots[s2].media.style.willChange = '';
      if (slots[s2].inner.style.willChange !== '') slots[s2].inner.style.willChange = '';
    }
    var jmin = Math.ceil((-RENDER_RANGE * st - x) / st);
    var jmax = Math.floor((RENDER_RANGE * st - x) / st);
    for (var k = slots.length - 1; k >= 0; k--) {
      if (slots[k].j < jmin || slots[k].j > jmax) {
        pool.push(slots[k].el);
        slots.splice(k, 1);
      }
    }
    for (var j = jmin; j <= jmax; j++) {
      var slot = null;
      for (var s = 0; s < slots.length; s++) {
        if (slots[s].j === j) { slot = slots[s]; break; }
      }
      if (!slot) {
        var el = pool.pop();
        if (!el) {
          el = document.createElement('article');
          el.className = 'skewed-card';
          el.innerHTML =
            '<div class="skewed-card-media">' +
              '<img class="skewed-card-img" alt="" decoding="async" draggable="false">' +
            '</div>' +
            '<div class="skewed-card-inner">' +
              '<span class="skewed-card-no"></span>' +
              '<h3 class="skewed-card-title"></h3>' +
              '<p class="skewed-card-desc"></p>' +
            '</div>';
          strip.appendChild(el);
        }
        var p = PROJECTS[wrapIdx(j)];
        var img = el.querySelector('.skewed-card-img');
        if (img.getAttribute('src') !== p.img) {
          img.setAttribute('src', p.img);
          img.alt = p.title;
          if (img.decode) img.decode().catch(function () {}); /* 换图提前解码防抖动 */
        }
        el.querySelector('.skewed-card-no').textContent = p.no;
        el.querySelector('.skewed-card-title').textContent = p.title;
        /* 2026-08-30：真实仓库标题用等宽小字（is-repo），建设中卡隐藏副标题 */
        el.querySelector('.skewed-card-title').classList.toggle('is-repo', !!p.link);
        var dEl = el.querySelector('.skewed-card-desc');
        dEl.textContent = p.desc || '';
        dEl.style.display = p.desc ? '' : 'none';
        el.classList.toggle('has-link', !!p.link);
        /* media = 图片包裹层：JS 内容滞后写在 media 上，CSS 悬浮缩放写在 img 上，
           两者互不冲突（第二百二十六批） */
        var media = el.querySelector('.skewed-card-media');
        slot = { j: j, el: el, media: media, img: img, inner: el.querySelector('.skewed-card-inner') };
        slots.push(slot);
      }
      var m = j * st + x;             /* 槽位屏幕位置（无回绕 —— 循环靠槽位进出） */
      var t = m / st;                 /* 距中心步数（小数，连续） */
      var u = Math.abs(t);
      /* 第二百一十三批（主人"点击背后左右的卡片移到该卡片"）：槽位 j 与可见度
         u 记到元素上，供 strip 点击事件委托判断 —— 点击 ±1/±2 卡 → 该卡居中 */
      slot.el._slotJ = j;
      slot.el._slotU = u;
      /* 第二百五十一批（主人"现在还有反弹"）：rotateY/scale 曲线从 easeOutQuad
         改回 smoothstep —— easeOutQuad 在 u=0 处斜率最大（2），中心卡滑到正中
         时旋转/缩放还在高速变化、瞬间静止 → 视觉顿挫 = "弹了一下"。
         smoothstep 在 u=0 端斜率归零 → 到达中心平滑停住，无顿挫；u=1 端同样
         归零（±1 卡静止时角度稳定）。位移（translateX）仍由 easeOutCubic 驱动，
         落定干脆不受影响。 */
      var g;
      if (u <= 1) g = ROT * smoothstep(u);
      else if (u <= 1.5) g = ROT * (1 - smoothstep((u - 1) / 0.5));
      else if (u <= 2) g = -45 * smoothstep((u - 1.5) / 0.5);
      else g = -45 + 10 * smoothstep(u - 2);
      var rot = -Math.sign(t) * g;
      /* 第二百四十七批（主人"参考美团 app 影院电影卡片设计"）：侧卡片加预览感
         —— LinearSnapHelper 风格的"影院下一场预告"效果。±1 缩小更深（0.78）、
         ±2 透明到 0.55 → 侧卡明显"在背后"预览，中心主卡始终 1.0/不透明。
         视觉层级：中心主卡 > ±1 预告 > ±2 远景。
         第二百六十二批（主人"要显示+1 +2 卡片"）：±2 档 opacity 0.55→0.70 ——
         卡片加大后远景预览更清晰可见（配合 CSS blur 4→2.5px）。 */
      var scBase, opBase;
      var eQ = smoothstep;
      if (u <= 1) { scBase = 1 - (1 - SC) * eQ(u); opBase = 1; }
      else if (u <= 2) { scBase = SC * (1 - 0.22 * eQ(u - 1)); opBase = 1 - 0.30 * eQ(u - 1); }
      else if (u <= 3) { scBase = SC * 0.78 * (1 - eQ(u - 2)); opBase = 0.70 * (1 - eQ(u - 2)); }
      else { scBase = 0; opBase = 0; }
      slot.el.style.transform =
        'translateX(' + m + 'px) rotateY(' + rot + 'deg) scale(' + scBase.toFixed(3) + ')';
      slot.el.style.opacity = opBase.toFixed(3);
      /* 第二百二十五批：zIndex / is-active 只在变化时写 —— 回弹收尾大部分帧
         这两者不变，跳过可减少主线程样式写入（低端机防卡顿） */
      var zi = Math.max(0, 2 - Math.round(u));
      if (slot.el._zi !== zi) { slot.el._zi = zi; slot.el.style.zIndex = zi; }
      var active = u <= 0.5;
      if (slot.el._active !== active) { slot.el._active = active; slot.el.classList.toggle('is-active', active); }
    }
  }

  /* smoothstep：0→1 缓动、端点斜率归零 —— 旋转/缩放曲线的连续插值（第二百零八批） */
  function smoothstep(s) {
    s = s < 0 ? 0 : (s > 1 ? 1 : s);
    return s * s * (3 - 2 * s);
  }
  /* easeOutQuad：仅尾段斜率衰减（无首段 0 起始），曲线更线性、更跟手，
     避免 smoothstep 在 u=0/1 双端归零导致的"启动慢 + 收尾慢"感。
     第二百四十六批 主人"滑动时动画很生硬"：snap 化矫枉过正，回退到连续曲线 + easeOutQuad。 */
  function easeOutQuad(s) {
    s = s < 0 ? 0 : (s > 1 ? 1 : s);
    return 1 - (1 - s) * (1 - s);
  }

  /* 第二百五十一批（主人"取消卡片背景放大"）：hover 放大已彻底移除（CSS），
     is-moving 机制随之废弃删除 —— setMoving 不再需要。 */

  /* 第二百五十五批（主人"回弹太慢，不跟手，我要的是好用。网上搜搜方法"）：
     调研结论（Framer Motion quick-snap / 动画最佳实践 / Swipe snap 共识）：
     - 功能性 snap 应 <300ms（200-300ms 是"快而不硬"甜区）；弹簧的"先滑过头
       再拉回"正是"不跟手"根源（初速度让卡片越过目标再回来）
     - 正确模式：ease-out 短缓动单调到位 + 速度只用于"决定目标档位"（不注入位移）
     - 落地：easeOutQuart + 固定 200ms（第二百五十六批 主人"每次反弹时长不一致"：
       按距离缩放会让松手位置随机 → 每次时长不同；固定后完全一致可预测），
       无过冲、无余振、松手立即朝目标走 = 跟手又好用 */
  /* 第二百六十批（主人"怎么就没动画了，有动画就不流畅？"）：
     目标逼近模式 —— 动画存在且流畅两全：
     - 所有操作（拖动松手/滚轮跳档/点击/键盘/自动）只设 xTarget
     - 动画循环每帧 x += (xTarget - x) * k（指数逼近，~80ms 收敛 272px）
     - 中途改目标：不打断、不重置（不像时间缓动 cancelAnimationFrame 重起
       —— 那正是 v=66"卡"的根源），动画持续向新目标平滑逼近
     - 既有动画（有过渡不生硬）又流畅（无打断卡顿）
     第二百六十一批（2026-08-29 主人"触控板要丝滑"）：k 改可调 ——
     吸附（松手/点击/键盘/停滚归位）默认 0.6；触控板连滚跟手用 0.9
     （横向拖拽已提至 0.95，见第二百六十八批 —— 滚轮连滚稍留余量防抖动）。 */
  var xK = 0.6;   /* 当前逼近系数（animateTo 按调用场景设置，60Hz 基准） */
  var xTargetPrev = 0;
  var lastFrameT = 0;   /* 第二百六十三批：帧率无关化 —— rAF 时间戳折算 60Hz 帧数，
                             120Hz/ProMotion 屏不再"每帧一次逼近"导致动画实际快一倍 */
  /* 第二百六十九批（主人"快速甩动不流畅 / 松手动画很奇怪"）：拖拽松手改用
     临界阻尼弹簧落位（取代指数急吸 0.6）。指数吸附从 0 速度起步、按剩余距离
     跳首帧（距槽 100px → 首帧 ~60px ≈ 瞬移级加速）—— 无视释放速度、速度断裂
     = 松手一冲一顿；弹簧 ζ=1（无过冲、单调落位）+ 继承释放速度 → 平滑减速、
     速度连续。w=22 rad/s：小位移从静止落位 ~0.25s（255 批"快而不硬"甜区，
     初版 w=11 对 40-100px 短程要 ~0.6s 才收敛 = 拖完还慢慢爬一段，过慢），
     甩动快则按速度自然更早到；数值积分稳定（w·dt≈0.37<2）。 */
  var SPRING_W = 22;
  /* 第二百七十一批（主人"优化结束滑动的动画"，选"舒缓 ~0.35s"）：停滚落位专用
     ω —— 拖拽松手继承速度（可更快到），滚停时条带已随 0.9 逼近收敛到目标
     （120ms 静默，初速≈0），纯从静止起弹；w=18 视觉 ~0.35s 落定（阻尼 ζ=1
     单调无过冲），介于点击/自动 AUTO_K 的 ~0.5s 与拖拽 w=22 的 ~0.25s 之间 */
  var WHEEL_SNAP_W = 18;
  var SPRING = null;   /* {t0, target, v} —— v 单位 px/s（t0 首帧 rAF 时间戳补齐） */
  function tick(ts) {
    raf = null;
    if (SPRING) {
      var sp = SPRING;
      if (!sp.t0) sp.t0 = ts;
      var dt = (lastFrameT ? (ts - lastFrameT) : 16.6667) / 1000;   /* 秒，钳 ≤50ms */
      if (dt > 0.05) dt = 0.05;
      lastFrameT = ts;
      var a = -sp.w * sp.w * (x - sp.target) - 2 * sp.w * sp.v;     /* 临界阻尼 ζ=1 */
      sp.v += a * dt;
      x += sp.v * dt;
      render();
      if ((Math.abs(x - sp.target) < 0.5 && Math.abs(sp.v) < 40) || ts - sp.t0 > 900) {
        SPRING = null; lastFrameT = 0; x = xTarget = sp.target; render();
      } else {
        raf = requestAnimationFrame(tick);
      }
      return;
    }
    var k = xK;
    if (lastFrameT) {
      var dtF = (ts - lastFrameT) / 16.6667;   /* 距上帧 ≈ 多少 60Hz 帧 */
      if (dtF > 0) k = 1 - Math.pow(1 - xK, dtF);
    }
    lastFrameT = ts;
    x += (xTarget - x) * k;
    render();
    if (Math.abs(xTarget - x) > 0.5) {
      raf = requestAnimationFrame(tick);
    } else {
      lastFrameT = 0;
      x = xTarget;
      render();
    }
  }

  /* 第二百六十四批（主人"连续滑动有时会卡住"）：统一中止吸附动画 —— 顺带清
     lastFrameT。此前打断点直接 cancelAnimationFrame 却保留旧时间戳：慢动画
     （k=0.15）中途被打断后，下一次 animateTo 首帧拿陈旧时间戳算 dtF → 巨大
     → k≈1 → 该滑的动画瞬移/跳帧。 */
  function stopTick() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    SPRING = null;   /* 第二百六十九批：拖动接管时清掉松手弹簧（若正在落位） */
    lastFrameT = 0;
  }

  /* animateTo：设置目标并确保动画循环在跑；运行中再次调用只改目标（不打断）。
     k 缺省 0.6（吸附）；触控板连滚跟手传 0.9。
     第二百六十九批：animateTo 取消进行中的松手弹簧（点击/键盘/滚轮/自动接管）。 */
  function animateTo(target, k) {
    cancelCoast();
    SPRING = null;
    xK = (k === undefined) ? 0.6 : k;
    if (Math.abs(target - x) < 0.5) { x = xTarget = target; render(); return; }
    xTarget = target;
    if (!raf) raf = requestAnimationFrame(tick);
  }
  /* 第二百一十二批（主人重复反馈"滚轮滑动卡片"问题）：修复连滚/连按时方向反转 ——
     next()/prev() 原来基于 xTarget 计算（xTarget - step()），若在弹簧动画中途再次
     触发（滚轮 90ms 冷却内连滚、或键盘连按），目标会倒退一档 —— 往下滚两次卡片
     却往回走。改为基于当前显示位置计算：目标 = round(x/step)·step ± step，
     方向永远与操作一致；键盘/滚轮/步进共用。
     第二百二十批（主人"自动向右滑动"）：修正 next/prev 语义 —— 下一个 = 右侧的卡
     成为主卡（数组正向 01→02→03→04，x 减小），上一个 = 左侧的卡成为主卡。
     此前 stepTo 正负号反了（next 实际去了上一张），自动轮播/键盘 ←→ 一并纠正。 */
  function stepTo(dir, k) {
    animateTo(Math.round(x / step()) * step() + dir * step(), k);
  }
  function next(k) { stepTo(-1, k); }
  function prev(k) { stepTo(1, k); }

  /* 惯性滑行（第二百零五批，调研 Flickity / Swiper free-mode 同款物理）：
     松手后按释放速度继续滑，速度每帧乘 ~0.87 指数衰减（第二百零六批 0.93→0.87，
     更快停稳），速度低于阈值或超时后吸附最近档位。
     慢速释放（<0.08）直接吸附 —— 不等待，即松即归。 */
  function cancelCoast() {
    /* coast 滑行已移除（第二百四十二批），保留此函数供调用方无副作用解除 */
  }
  /* 第二百四十二批（主人"滑动没有回弹"→ 美团效果）：彻底移除惯性滑行 coastTick
     —— 松手后不再"减速滑行一段再吸附"，而是直接 easeOutQuart 落定到目标档位。
     美团模式：拖到哪松手就停在哪张卡，无过冲、无回弹、无惯性感。
     目标档位规则（snap）：
       - 拖动过半档（|dx| ≥ step/2）→ 前进/后退一档
       - 未过半档 → 回到原档
       - 释放速度快（|vel| ≥ 0.6）→ 强制前进/后退一档（轻甩也算切换） */
  function snapToSlot() {
    var st = step();
    animateTo(Math.round(x / st) * st);
  }
  function snapFromDrag(vel) {
    var st = step();
    var nearest = Math.round(x / st) * st;
    var dx = x - nearest;
    var dir = 0;
    if (Math.abs(dx) >= st / 2) dir = dx > 0 ? 1 : -1;   /* 拖过半档 */
    else if (Math.abs(vel) >= 0.6) dir = vel > 0 ? 1 : -1; /* 轻甩 */
    /* 第二百五十五批：速度只决定目标档位，不注入位移（跟手、无滑过头回拉）。
       第二百六十九批：落位从指数急吸 0.6 改临界阻尼弹簧 —— 继承释放速度平滑
       减速，速度连续无断裂（releaseSpring）。 */
    releaseSpring(nearest + dir * st);
  }
  /* releaseSpring：临界阻尼弹簧（ζ=1）落位到 target。v0 = 松手瞬间卡片实际速度
     （dragTick 逐帧测的 px/s，dragVel）—— 甩动快 → 早期到、甩动慢 → 缓落，
     全程单调无过冲；中途被下一次 pointerdown/键盘/滚轮/自动接管时，由
     stopTick()/animateTo() 清除 SPRING 平滑切换（不打断原则同 260 批）。
     第二百七十一批：抽通用 startSpring(target, v0, w) —— 拖拽松手传 dragVel/22，
     停滚落位传 0/18（见 wheelEnd）。 */
  function startSpring(target, v0, w) {
    SPRING = {
      t0: 0,
      target: target,
      v: (isFinite(v0) && Math.abs(v0) < 6000) ? v0 : 0,
      w: w
    };
    if (raf) { cancelAnimationFrame(raf); raf = null; }   /* 换模式需重启循环 */
    lastFrameT = 0;
    if (Math.abs(x - target) < 0.5 && Math.abs(SPRING.v) < 40) {
      SPRING = null; x = xTarget = target; render(); return;
    }
    xTarget = x;   /* 弹簧期间指数目标无意义 —— 同步到当前防兜底读到陈旧值 */
    raf = requestAnimationFrame(tick);
  }
  function releaseSpring(target) { startSpring(target, dragVel, SPRING_W); }

  /* 键盘 ←/→（轮播聚焦时）：第二百六十三批追加 —— 与点击/自动轮播同为
     "离散跳一档"，统一用舒缓系数 AUTO_K（0.15，≈0.45~0.5s 优雅滑行） */
  root.tabIndex = 0;
  root.addEventListener('keydown', function (e) {
    if (dragging) resetDrag();   /* 第二百六十四批：拖拽态失联时键盘先接管 */
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev(AUTO_K); autoStop(); autoStart(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); next(AUTO_K); autoStop(); autoStart(); }
    lastInputT = Date.now();   /* 第二百六十六批 */
  });

  /* 拖拽（pointer events，横向跟手）：按下取消动画/滑行 → 直接改 x →
     松手按释放速度惯性滑行后吸附（第二百零五批，见 startCoast）。 */
  function setDraggingClass(on) {
    /* 2026-08-30：is-dragging 同时打到 strip —— 拖住卡片外空白处（可拖动区域）
       时也显示 grabbing，不只在卡片上拖动才变手型 */
    strip.classList.toggle('is-dragging', on);
    for (var i = 0; i < slots.length; i++) slots[i].el.classList.toggle('is-dragging', on);
  }
  strip.addEventListener('pointerdown', function (e) {
    /* 第二百六十六批：孤立点击判定 —— 先取本击距上次交互的间隔，再盖新戳 */
    tapInputGap = Date.now() - lastInputT;
    lastInputT = Date.now();
    /* 第二百三十一批（主人"连续点击时卡片卡住"）：不再一按下就取消弹簧动画 ——
       按下即冻结正是连点时"卡住"的来源（down→up 间隙动画停摆）。
       第二百六十七批（主人"快速点击 +1/+2 连续移动不流畅"，20ms 采样实锤：
       每次点击出现 67~83ms 位移冻结段 —— 即按下瞬间 stopTick 硬停、松开才重启
       的 stop-go）：按下**不打断**任何进行中的滑行（点击只是改目标，动画保持
       连续单增逼近）；动画留到"真正开始拖动"（位移 >8px）时才打断接管。
       注：264 批曾在此无条件 stopTick（为清陈旧 lastFrameT），但它同时把快速
       连点变成"每击硬停一拍"；时间戳问题只发生在"取消 rAF 后重启"，那仍由
       拖动接管处的 stopTick 覆盖，此处不再需要。 */
    tapWasAnimating = !!(raf || dragRaf);   /* 第二百六十五批：先记下"按下前是否有动画" */
    if (dragRaf) { cancelAnimationFrame(dragRaf); dragRaf = null; }
    cancelCoast();
    if (wheelIdleTimer) { clearTimeout(wheelIdleTimer); wheelIdleTimer = null; }
    wheeling = false;
    autoStop();
    /* 第二百二十九批：记录"按下时"命中的槽位（连点/卡片移动中点击，松手时卡片可能
       已移走、elementFromPoint 会命中错误目标）—— 点击意图以按下瞬间为准。
       第二百三十二批（主人"点左边不如右边丝滑 / +2 卡动画方向不对"）：必须按
       "槽位"（点击的那张具体副本）而非卡号 —— ±2 槽位是同一张卡（C 重复显示在
       两侧），按卡号会把左右两张 C 当成同一个，点左边 C 却去居中右边那张、
       带子往左跑（背离点击方向）。 */
    var tc = e.target;
    while (tc && tc !== strip && !tc.classList.contains('skewed-card')) tc = tc.parentNode;
    tapHit = !!(tc && tc !== strip && tc._slotJ !== undefined && tc._slotU <= CLICK_MAX_U);
    tapSlotJ = tapHit ? tc._slotJ : -1;
    tapU = (tc && tc !== strip && tc._slotU !== undefined) ? tc._slotU : -1;
    velSamples = [];
    dragVel = 0; dragPrevX = NaN; dragPrevT = 0;   /* 第二百六十九批：重开速度采样 */
    dragging = true;
    dragEngaged = false;
    dragStartX = e.clientX;
    dragBaseX = x;
    if (strip.setPointerCapture) strip.setPointerCapture(e.pointerId);
  });
  strip.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    /* 第二百一十八批（主人"松开鼠标后移动，卡片还跟着滑"）：偶发 pointerup
       未送达（如在窗口外松开/系统手势抢占）会让 dragging 卡在 true，之后的
       "幽灵移动"继续驱动卡片。松开后 buttons 必为 0 —— 据此直接走完整释放
       逻辑（惯性滑行/吸附），并复位 dragging。 */
    if (e.buttons === 0) {
      endDrag(e);
      return;
    }
    /* 第二百三十一批：位移跨过阈值才算拖动开始 —— 此时才打断动画并取当前基准。
       第二百六十九批（主人"快速甩动不流畅"）：不再把 dragStartX 重基线到当前
       指针 —— 原逻辑吞掉 down→engage 间的位移（快速甩动首段常达 30-60px），
       卡没跟上手、甩距被低估。现在指针位移始终从按下点计（dragBaseX 仍取
       接管当下 x，滑行中按下不会跳变）：甩动全程 1:1 跟手。 */
    if (!dragEngaged && Math.abs(e.clientX - dragStartX) > 8) {
      dragEngaged = true;
      stopTick();
      dragBaseX = x;
      dragTarget = x;
      dragPrevT = 0; dragPrevX = NaN;
      setDraggingClass(true);
    }
    if (dragEngaged) {
      /* 第二百五十九批（主人"滑动不是很流畅，很卡很慢"）：棘轮动画打断重起是
         卡顿根源（每跨档启动 130ms 动画、没完成又被下一个打断 → x 追不上指针）。
         恢复拖动完全跟手：pointermove 只更新目标位置，dragTick rAF 每帧 0.95 逼近
         —— 流畅跟手不卡；咔哒/落定交给松手（snapFromDrag 0.6）。 */
      dragTarget = dragBaseX + (e.clientX - dragStartX);
      if (!dragRaf) { dragLastT = 0; dragRaf = requestAnimationFrame(dragTick); }  /* 重起循环先清时间戳 */
    }
    velSamples.push({ t: e.timeStamp, x: e.clientX });
    while (velSamples.length > 1 && e.timeStamp - velSamples[0].t > 40) velSamples.shift();
  });
  /* 拖动平滑：rAF 每帧向目标逼近 —— 跟手流畅、吸收事件抖动（第二百一十六批）。
     第二百六十八批（主人"优化鼠标拖拽滑动手感 → 拖动更贴手"）：
     - 逼近系数 0.9 → 0.95（60Hz 基准）：快甩稳态滞后减半（0.9 时 ≈ v×1.9ms，
       0.95 时 ≈ v×0.9ms）—— 卡片贴指、甩动更跟手
     - 帧率无关化：dragTick 此前是全文件唯一未折算 60Hz 的动画循环（tick() 已折算），
       120Hz/ProMotion 屏上每帧收敛快一倍、手感与 60Hz 不一致；现按 rAF 时间戳算
       dtF，k = 1-(1-0.95)^dtF，任意刷新率手感一致
     - 重起循环（dragRaf 为空时）清零 dragLastT，避免陈旧时间戳算超大 dtF 瞬移
     - 松手吸附仍走 snapFromDrag 0.6（直接操作干脆收尾，不动） */
  var DRAG_K = 0.95;
  function dragTick(ts) {
    dragRaf = null;
    var k = DRAG_K;
    if (dragLastT) {
      var dtF = (ts - dragLastT) / 16.6667;   /* 距上帧 ≈ 多少 60Hz 帧 */
      if (dtF > 0 && dtF < 4) k = 1 - Math.pow(1 - DRAG_K, dtF);
    }
    dragLastT = ts;
    x += (dragTarget - x) * k;
    /* 第二百六十九批：记录卡片实际速度（px/s）—— 松手弹簧继承它，
       而非重起一个"从静止开始"的动画（速度断裂的根源） */
    if (dragPrevT) {
      var dtSec = (ts - dragPrevT) / 1000;
      if (dtSec > 0 && dtSec < 0.2) dragVel = (x - dragPrevX) / dtSec;
    }
    dragPrevX = x;
    dragPrevT = ts;
    render();
    if (dragging && Math.abs(dragTarget - x) > 0.3) {
      dragRaf = requestAnimationFrame(dragTick);
    } else {
      /* 第二百七十二批：循环收敛退出 = 卡已随手指停稳 —— 清零冻结速度。
         旧逻辑 dragVel 冻结在末帧高速，用户停住后松手时 releaseSpring 会继承
         这份陈旧初速（"明明停住了松手还往前冲"的第二来源）。 */
      dragVel = 0;
    }
  }
  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    if (dragRaf) { cancelAnimationFrame(dragRaf); dragRaf = null; }
    setDraggingClass(false);
    var moved = Math.abs(e.clientX - dragStartX);
    /* 释放速度（第二百七十二批，主人"拖动停在卡片中间会跳下一张"）：
       双通道判定，两个通道各自免疫"停住后才松手"：
         A. 尾速：只用松手前 ≤40ms 采样，且 40ms 内无新采样 = 已停稳 → 0。
            旧逻辑取 velSamples 首尾（100ms 窗）不查新旧：快速拖动后停住、
            过一会才松手，首尾采样横跨移动段 → 算高速 = 误判轻甩 → 停半路
            却跳下一张（drag-stop.js faststop：快移 90px<半档停 90ms 仍跳卡）
         B. 卡片实速 dragVel（px/s，dragTick 逐帧测）：收敛退出即清零 ——
            手指停住后 ~1-2 帧内必为 0，不受合成事件时间戳影响
       取两者中幅值大者定方向；真轻甩（移动与松手几乎同时）总有一路有速度。 */
    while (velSamples.length > 1 && e.timeStamp - velSamples[0].t > 40) velSamples.shift();
    var s0 = velSamples[0], s1 = velSamples[velSamples.length - 1];
    var vTail = (s1 && s0 && s1.t > s0.t && e.timeStamp - s1.t <= 40)
      ? (s1.x - s0.x) / (s1.t - s0.t) : 0;
    var vCard = (isFinite(dragVel) && Math.abs(dragVel) < 6000) ? dragVel / 1000 : 0;
    var vel = (Math.abs(vTail) >= Math.abs(vCard)) ? vTail : vCard;
    velSamples = [];
    /* 第二百七十批：点击判定放宽 —— 只要没真拖走（位移 ≤CLICK_SLOP=24px）且
       松手速度低（<0.5px/ms）一律按"轻点"处理，居中 pointerdown 时的卡：
       真实鼠标按下抖动 8~30px 常见，旧阈值（moved≤6）把抖动推入"拖动"分支、
       低速松手又按"未过半档弹回"→ 卡片纹丝不动（观感 = 点击完全没反应）。
       真拖动（>24px）与高速轻甩（vel≥0.5，指"快而不硬"的甩动）仍走 snapFromDrag。 */
    if ((!dragEngaged || moved <= CLICK_SLOP) && Math.abs(vel) < 0.5) {
      /* 轻点 = 点击背后卡片居中（第二百一十四批起）：
         目标槽位以 pointerdown 记录的 tapSlotJ 为准（连点/移动中点击不误判）；
         目标 x = -j·step 使该槽位（点击的那张副本）居中 —— 环上无歧义。 */
      var j = tapSlotJ;
      var hasJ = tapHit;
      if (!hasJ) {
        var hit = document.elementFromPoint(e.clientX, e.clientY);
        while (hit && hit !== strip && !hit.classList.contains('skewed-card')) hit = hit.parentNode;
        if (hit && hit !== strip && hit._slotJ !== undefined && hit._slotU <= CLICK_MAX_U) {
          j = hit._slotJ; hasJ = true;
        }
      }
      if (hasJ) {
        /* 真实项目卡（2026-08-30 起）：轻点居中的真实卡 → 打开 GitHub。
           第二百六十五批（主人"快速连点卡片卡住"）修正弹窗判定：
           原来用"松开瞬间"的 |t| —— 慢滑 0.5s 期间连点，侧卡常在按住间隙
           漂进中心区，误当"点主卡"→ 弹新 tab 抢焦点，原 tab 隐藏后 rAF
           挂起 = 卡片冻结半程 + 后续点击全失效。判定改两点：
             (1) u 取 pointerdown 时刻（按下时该卡距中心步数，动画已被停，
                 不随松开漂移）；
             (2) 要求按下时条带静止（tapWasAnimating=false，无动画在跑）——
                 滑行中的点击一律只居中，绝不弹窗。
           刻意点静止的主卡（u≤0.5、无动画）仍正常开链接。 */
        var stT = step();
        var pj = PROJECTS[wrapIdx(j)];
        var uAtDown = (tapU >= 0) ? tapU : Math.abs((j * stT + x) / stT);
        /* 第二百六十六批（主人"快速点击还是会卡住"，真机复现 chaseCard 模式）：
           第一击把 repo 卡滑到中心，追点第二击常在慢滑结束后落在静止居中的该卡上
           —— u≤0.5 且无动画 = 满足 265 批条件 → 误弹窗。再补一道"孤立点击"闸：
           距上次轮播交互（pointerdown/键盘/滚轮）<800ms 一律视为连点簇，只居中
           绝不弹窗；交互停歇 ≥800ms 后的单击（刻意点主卡）才开链接。 */
        var isolated = tapInputGap >= OPEN_IDLE_GATE;
        if (pj.link && uAtDown <= 0.5 && !tapWasAnimating && isolated) {
          window.open(pj.link, '_blank', 'noopener');
        } else {
          /* 第二百六十三批追加（主人"点击页面的动画和自动轮播一样"）：
             点击侧卡居中改用 AUTO_K —— 与自动轮播同款 ~0.5s 优雅滑行 */
          animateTo(-j * stT, AUTO_K);
        }
        autoStart();
      }
      return;
    }
    snapFromDrag(vel);
    autoStart();
  }
  strip.addEventListener('pointerup', endDrag);
  strip.addEventListener('pointercancel', endDrag);
  /* 第二百一十八批兜底：strip 的 pointerup 偶发未送达（窗口外松开等）时，
     全局监听兜底结束拖拽 —— endDrag 幂等（dragging 已 false 则直接返回），
     重复触发安全。 */
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  /* 第二百六十四批（主人"连续滑动有时会卡住"）：指针在窗口外松开 / 系统手势抢占时
     pointerup 可能永不送达 → dragging 卡 true。此后滚轮被 wheel 里的 dragging 闸
     整段丢弃、自动轮播被 autoStart 的 dragging 闸挡住 —— 轮播"死机"（观感 = 卡住）。
     218 批的 buttons=0 检测只覆盖"之后还有 pointermove"的场景，纯滚轮用户永远等不到。
     修复：任何"新意图"（滚轮 / 键盘 / 窗口失焦 / 页面隐藏）到来都先强制复位拖拽态。 */
  function resetDrag() {
    if (!dragging) return;
    dragging = false;
    if (dragRaf) { cancelAnimationFrame(dragRaf); dragRaf = null; }
    setDraggingClass(false);
    velSamples = [];
  }
  window.addEventListener('blur', resetDrag);
  if (document.addEventListener) {
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) resetDrag();
    });
  }

  /* 滚轮 / 触控板滚动（第二百六十一批 2026-08-29 主人"一格一格咔哒 / 滑动经过
     卡片没动画 / 触控板不丝滑"）：移除第二百五十七批的滚轮棘轮（累计跨过半档
     跳一档的咔哒刻度感）——
     - 连续跟手：目标 = 手势起点 + 累计位移（不量化成档位），animateTo(…, 0.9)
       每帧逼近，与横向拖拽同款系数；滑动全程卡片持续倾斜/缩放，skew 动效
       全程可见（此前棘轮期间 x 冻结在档位、跳档才动 = "经过卡片没动画"）。
     - 停滚 120ms 无事件 → 平滑吸附最近档位（0.6 短促收敛，无咔哒、无回弹）。
     - 方向保持 d = -deltaX - deltaY（左滑/上滑→x 增大=上一个，右滑/下滑→x 减小
       =下一个；第二百三十三批主人指定的传统滚动方向，不改）。
     - e.stopPropagation()：轮播区滚轮不再冒泡到 script.js 的整页平滑滚动器 ——
       此前光标停在轮播上时页面同时在滚，两套滚动叠加 = "和其他方向手感不一样"。 */
  var wheeling = false, wheelBase = 0, wheelAcc = 0, wheelIdleTimer = null;
  function wheelEnd() {
    wheelIdleTimer = null;
    if (!wheeling) return;
    wheeling = false;
    wheelBase = 0; wheelAcc = 0;
    /* 停滚落位（第二百七十一批，主人"结束滑动的动画"）：
       旧 animateTo(nearest, 0.6) 是指数急吸 —— 从静止起步按剩余距离跳首帧
       （首帧 ~0.6×余距 ≈ 瞬移级加速、速度断裂），~0.1s 硬停；
       改临界阻尼弹簧 ω=18：从 0 速度平滑加速再减速、单调落位 ~0.35s ——
       点击/自动 0.5s 优雅 与 拖拽松手 0.25s 干脆 之间的中间语感。 */
    var st = step();
    var nearest = Math.round(x / st) * st;
    if (Math.abs(nearest - x) > 0.5) startSpring(nearest, 0, WHEEL_SNAP_W);
    autoStart();
  }
  root.addEventListener('wheel', function (e) {
    e.preventDefault();
    e.stopPropagation();
    /* 第二百六十四批：拖拽态失联（dragging 卡 true）时滚轮不再被丢弃 ——
       强制复位后接管；这正是此前"连续滑动突然卡住"的主因 */
    resetDrag();
    autoStop();
    lastInputT = Date.now();   /* 第二百六十六批：滚轮后紧跟的点击也计入交互簇 */
    /* 第二百七十一批：deltaMode 归一化 —— Safari 物理滚轮常报 line 模式
       （deltaY≈1-3 行），原样累加几乎不动；page 模式 ×step。触控板恒为
       pixel 模式（deltaMode=0）不受影响。 */
    var d = -e.deltaX - e.deltaY;
    if (e.deltaMode === 1) d *= 20;          /* line → px */
    else if (e.deltaMode === 2) d *= step(); /* page → px */
    if (!wheeling) { wheeling = true; wheelBase = x; wheelAcc = 0; }
    wheelAcc += d;
    /* 连续跟手：不量化档位，目标随累计位移走（0.9 = 拖拽同款手感） */
    animateTo(wheelBase + wheelAcc, 0.9);
    if (wheelIdleTimer) clearTimeout(wheelIdleTimer);
    wheelIdleTimer = setTimeout(wheelEnd, 120);
  }, { passive: false });

  /* 自动轮播（第二百一十九批 主人"卡片隔断时间自动滑动到下个卡片"；
     第二百二十批 主人"自动向右滑动 / 悬停不用取消"）：
     默认 4000ms 自动进下一卡（右侧卡成为主卡，数组正向）；悬停不再暂停
     （移除 autoHover），仅拖拽/滚轮/键盘时暂停，交互结束后重新计时；
     页面隐藏时暂停。 */
  var AUTO_MS = 6000;   /* 第二百二十一批 主人"自动滑动改为6秒"（原 4000ms） */
  /* 第二百六十三批（主人"自动轮动卡片动画太快"）：舒缓展示系数 ——
     0.15 @60Hz ≈ 0.45~0.5s 优雅减速，倾斜/缩放动效全程清晰可见。
     适用范围（第二百六十三批追加，主人"点击动画也和自动轮播一样"）：
     自动轮播切换 / 点击侧卡居中 / 键盘 ←→ 均属"离散跳一档"，统一用本系数；
     拖拽松手 / 停滚落位另走临界阻尼弹簧（第二百六十九/七十一批：0.25s /
     0.35s 平滑落位）；本系数只服务"离散跳一档"的展示类操作。 */
  var AUTO_K = 0.15;
  var autoTimer = null;
  function autoStart() {
    if (dragging || wheeling) return;
    if (autoTimer) clearTimeout(autoTimer);
    autoTimer = setTimeout(autoStep, AUTO_MS);
  }
  function autoStop() {
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
  }
  function autoStep() {
    autoTimer = null;
    next(AUTO_K);
    autoStart();
  }
  if (document.addEventListener) {
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { autoStop(); resetDrag(); }
      else {
        autoStart();
        /* 第二百六十五批兜底：tab 隐藏时 rAF 被浏览器挂起，恢复可见若发现
           动画停在半程且 rAF 链已断 → 重新续跑（正常情况浏览器会自动恢复，
           此分支只在边界情形兜底） */
        if (Math.abs(xTarget - x) > 0.5 && !raf && !dragging && !wheeling) {
          raf = requestAnimationFrame(tick);
        }
      }
    });
  }

  /* resize（媒体查询改卡片宽/间距）→ 重算几何并重渲染 */
  var rTimer = null;
  window.addEventListener('resize', function () {
    if (rTimer) return;
    rTimer = setTimeout(function () { rTimer = null; measure(); render(); }, 150);
  });

  measure();
  render();
  autoStart();
})();
