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
   - 透视：旧版 .skewed-strip 上的 perspective: 1400px（本设计已无 3D 透视）。
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
   数据：PROJECTS 数组（4 张图片卡，图在 Cloudflare R2 的 images/projects/；
   n<5 时一屏自动重复，n≥5 时一屏全唯一）。换图要顺手把那条 URL 的 ?v= 加一
   —— 对象带 immutable 一年缓存，不升版本号老访客看不到新图。
   第二百六十三批 2026-09-05（主人"自动轮动卡片动画太快"）：
   - 舒缓展示系数 0.15（≈0.45~0.5s 优雅减速滑到中心，倾斜/缩放动效
     全程可见）：自动轮播切换、点击侧卡居中、键盘 ←→ 统一使用
     （同批追加 主人"点击页面的动画和自动轮播一样"）
     —— 该常量第二百六十三批叫 AUTO_K，第二百八十一批更名 STEP_K（自动轮播
        已整块移除，见文件头 281 批）
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
   - 弹簧可被任意后续操作接管（stopTick/animateTo 清 SPRING，不打断原则不变；
     第二百七十六批起弹簧整体换成三次 Hermite 曲线 FIN，接管语义不变）
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
     ⚠️ 第二百七十六批实测：这条 ω=18 弹簧留了 133ms 的指数尾巴爬行
     （落 129.5px 实测 533ms，后 8 帧每帧 <0.5px）= 主人说的"慢慢停下时卡顿"，
     已被三次 Hermite 曲线取代（见文件头 276 批）
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

   /* 第二百七十五批 2026-09-13（主人"解除这个限制，改回一次可以滑动多张"）：
   273 / 274 两批做的「一次手势 = 一张」整块撤掉，回到**自由跟手** ——
   一次手势能滑几张就几张。
   - 滚轮/触控板：导轨 1:1 跟手、位移不夹；停滚 120ms → 弹簧落**离当前位置最近**一档
   - 指针拖拽：跟手位移同样不夹（273 批的 ±1 张 + 0.15 越界阻尼一并去掉），
     松手按「过半档 / 轻甩 ≥0.6px/ms」落位 —— 拖 2.5 张就落 2~3 张
   - 键盘 ←→ / 点侧卡 / 自动轮播本来就是 ±1 档（stepTo），一直没动
   - 274 批那处「停滚落位继承导轨实测速度」也一并撤掉 —— 探针实测（v275-free.js G）
     证明它是**空操作**：停滚判定本身要等 120ms 静默，而导轨在这 120ms 内早已
     收敛到目标、railVel 归零，落位弹簧读到恒为 0。留着只是多 30 行会骗人的代码。
   撤掉的清单（要回滚就 `git show 29d3398:assets/js/projects-carousel.js`）：
     PAGE_PER_GESTURE / railClamp / slotAnchor / pageLanding / ?cpages=0 /
     惯性尾巴识别（wTail·wGain·W_RUBBER·W_SPIKE·W_WIN）/ 锚点续接（W_REARM·W_MIN_MS）
   ⚠️ 已知代价（主人明确要求接受）：一次很猛的甩会把导轨一次带出去好几张 ——
   真机探针实测同一个 1440px 触控板手势 = 5 张（正是 273 批要治的现象）。
   参数覆盖：?cdebug=1（暴露 window.__car() / window.__carAuto()）、
            ?cwidle=<ms>（改停滚判定窗口，默认 120ms —— 调小 = 落位更早接上）
   ⚠️ 第三百二十一批 2026-09-26 收回去了：主人「项目页面的卡片我想要一次只能滑动一张
      卡片……参考浏览照片滑动时的逻辑」—— 上面那句"已知代价：一个手势 = 5 张"
      正是他这次要治的现象。本批把 PAGE_PER_GESTURE / railClamp / slotAnchor /
      pageLanding 装回来（跟手改**硬夹**，不再用 273 批的 0.15 阻尼），
      跟手方式与验收见文件头 321 批。**别再拿这段去"修回自由跟手"，要改先问。**


   第二百七十八批 2026-09-13（主人"要不不用现在这款卡片的设计了，换成这网页帆布展示
      的设计"，参考站 = tblog.mmzhiku.xyz 首页的 home-blinds-scenes）：
   skewed 那套卡片**整个换掉**，改成参考站的"立牌影像排"——吊线 + 竖排标签栏 +
   明信片（胶带 / 序号贴纸 / 照片框 / 手绘涂鸦 / 逐字落下的说明 / 右下角歪斜的印章）。
   实测依据：~/.workbuddy/scratch/tblog-canvas/tblog-scenes4.js（步距 762px、
   当前张 scale 1/op 1，邻张 0.94/0.4→0，20 格进度尺，GSAP 逐件装配时间轴）。
   **本批只动渲染层**：DOM 构建（buildScene）、逐帧曲线（render）、进度尺（279 批撤掉）、
   入场装配。
   输入层（1:1 跟手 / 停滚 120ms / 三次 Hermite 落位 / 点击安全闸 / 键盘 / 自动轮播）
   一行没动 —— 那是 264~276 批四十几轮真机调试的产物，重写等于把坑再踩一遍。
   撤掉的：rotateY 旋转曲线、±1/±2 的 0.85/0.70 透明分级、"±2 也要看清"的整套诉求
   （那是 skewed 设计的要求，随设计一起作废）、smoothstep/easeOutQuad 两个缓动函数。
   有意偏离参考站的三点写在 style.css 的 .pj-scenes 块顶部（横向推进改拖拽、配色走
   站内 token、卡片尺寸按本站垂直预算）。


   第二百七十九批 2026-09-14（主人"移除项目卡片下面的进度条；优化一下卡片大小和排版，
      卡片可以大一点点"）：
   进度尺**整条撤掉**（参考站底部那条 20 格亮块）—— HTML 的 .pj-meter、CSS 的
   .pj-meter* 规则、本文件的 meter/meterLit 变量与逐帧亮块循环一起清掉，不留孤儿。
   位置信息由每张卡右下角的印章「02 / 04」承担，不需要第二条指示器。
   尺寸调整全在 style.css（照片高 27vh → 31vh，帽 280 → 320 —— 正好吃掉撤掉那条尺
   腾出来的 ~32px）：--pj-step 是从卡片宽算出来的，所以卡变大 = 步距自动变大，
   **引擎这一层只删代码、不改逻辑**。


   第二百八十一批 2026-09-14（主人"移除项目页里卡片自动滑动的功能"）：
   自动轮播**整块撤掉**（第二百一十九批引入，最大寿命 6 秒/次）——
   AUTO_MS / autoTimer / autoStart / autoStop / autoStep 五个符号连同步调用点
   （keydown / pointerdown / wheel / wheelEnd / endDrag / 初始化 / visibilitychange）
   一起清掉，不留孤儿。现在卡片**只在主人操作时动**：拖拽 / 滚轮 / 键盘 ←→ / 点侧卡。
   - 唯一**故意留下**的是 `window.__carAuto`（?cdebug=1 下的空壳）：验收套件
     pj-check / pj-parts / pj-rhythm / pj-wire-probe 在采样前都调它冻结轮播，
     删掉会让它们从"冻结后取证"变成"对着正在走的动画取证"（假红）。空壳 = 无害。
   - AUTO_K 更名 STEP_K（同批）：它从来只服务"离散跳一档"（点击侧卡居中 + 键盘
     ←→），移除自动轮播后叫 AUTO 会把人骗去别处找轮播代码。数值 0.15 未变。
   - 拖拽松手 / 停滚落位的三次 Hermite 曲线、1:1 跟手、点击安全闸一行未动。


   第二百八十六批 2026-09-21（主人"项目页卡片，滑动置卡片后，卡片的动画明显有延迟"）：
   装配起跑判据从「**整条导轨静止**」改成「**手停了 + 目的地已定 + 离目的地 ≤0.2 档**」。
   实测（scratch/pj-enter-lag/probe-lag.js；下表 = **手势最后一个输入 → 装配真正出现
   第一个动作帧**的毫秒数，括号里是 390×844 的对照）：

     单步整档（一次滚轮 = 一档）        228（218）→ 93（97）
     触控板停在半档外（0.6 档惯性尾巴）   481（479）→ 262（258）
     触控板甩 1.4 档停下                482（483）→ 310（311）
     触控板连续 12 事件 / 500ms（一档）  157（165）→ 86（86）
     快甩 4 档 / 160ms                 191（187）→ 98（87）
     两段连滑（各 2 档，间隔 400ms）     177（193）→ 99（91）
     拖拽 240px 后松手                 296（298）→ 180（47）
     键盘 →（离散跳一档）                719（668）→ 196（186）
     点侧卡居中                        723（—）  → 189（—）
   即：**每一次"把卡片滑到位"的动画都提前了 100~530ms**，最狠的是
   键盘 ←→ / 点侧卡（原来要等指数逼近收敛到 0.5px，实测 0.7s）。

   改前为什么这么慢 —— 三道**串行**的等待，谁也不能提前：
     ① `wheeling` 要等 W_IDLE=120ms 静默才敢落位（那 120ms 是"手势结束"的判据，
        不是"卡片到位"的判据），落位曲线本身还要最多 320ms（FIN_TMAX_WHEEL）；
     ② `railResting()` 把"落位曲线跑完"也算进"静止"，所以装配只能等曲线收尾；
     ③ 落下来之后**没有任何调用点会重判**（wheelEnd 只改标志位、不 render），
        全靠一条 90ms 粒度的重试链兜 —— 于是又白白多等 0~90ms。
     再加一条独立的（编号 ④）：`animateTo` 的指数逼近（k=0.15）收敛到 0.5px 要
     ~0.45s，装配也一直等它 —— 这就是键盘/点击那 0.7s 的来源。

   新判据 railCanEnter()（三条缺一不可，见函数注释）：
     · 手停了：距最近一次滚轮事件 ≥ ENTER_QUIET=50ms。**这是"不误播"的唯一闸门** ——
       触控板/惯性尾巴的事件间隔是 8~32ms，连续滑动时永远凑不出 50ms 静默，
       所以 2026-09-17 那批"快速滑动连续播放"的场景在结构上放不出来
       （反证：probe-enter3.js 在 1.6s 连续快滑里采样贴纸 scale，改后仍是
        "全程平在 1、停下后一条完整山丘"，回升次数 1，与改前逐项一致）。
     · 目的地已定：落位曲线的终点（FIN.to）/ 指数逼近的目标（xTarget）落在档位上 ——
       "手还在滑、导轨在追一个非档位目标"与"停在半路、还没开始落位"两种情况都被它挡住。
     · 离目的地 ≤ ENTER_NEAR=0.2 档：**这一条让装配的最后 ~100ms 与落位重叠** ——
       0.2 档 ≈ 落位曲线剩余 100ms（Hermite 中段速度 0.85px/ms），
       于是装配的定音件（蓝色贴纸，延迟 0.1s）正好落在卡片停稳那一刻，
       开场的圆点/眉标/竖线则在最后那几帧里跑完 —— 参考站的装配本来也是**随到位一起**
       发生的，不是"先停稳两拍、再起跑"。
   为什么不会多播：装配只在 `.is-active` 翻真的那一次触发（原逻辑未动），
   本批只改"什么时候起跑"，不改"起跑几次"（反证：probe-enter.js 的 pj-stick 触发数
   1 / 1 / 3、同元素 520ms 内被重启 0 —— 与改前逐行相同）。
   摘 is-enter 从"立即"改成"播完再摘"（dropEnter）：起跑提前后必然多出"起跑后又被滑走"
   的场合，直接摘类会让动画瞬间跳回静止态；而所有装配动画的收尾值本来就等于静止态
   （pj-stick → scale 1、pj-char → opacity 1、pj-unveil → clip 全开、pj-swing → rotate 0），
   所以留着播完看不见任何跳变。回池（出渲染范围）时仍然立即摘干净，池里不留装扮。
   重试链 90ms 定时器 → 逐帧 rAF：50ms 的静默阈值比 90ms 细，粗粒度会把省下的时间还回去。


   第三百二十一批 2026-09-26（主人"项目页面的卡片我想要一次只能滑动一张卡片，
      一次只能滑动一张卡片的逻辑可以参考浏览照片滑动时的逻辑"）：
   **一次手势 = 一张卡**装回来（275 批撤过一轮，见 275 批那段末尾的 ⚠️）。

   参考就在站内：assets/js/lightbox.js 那条规则的原话是"**目标索引在手势【开始】时就锁成
   ±1，松手只决定方向、不决定距离**"（同族：Embla `skipSnaps:false`、Swiper 非 freeMode、
   CSS `scroll-snap-stop: always`、PhotoSwipe 的 indexDiff 硬 ±1、iOS `isPagingEnabled`）。
   本批把**规则**照抄、**跟手方式不照抄**：灯箱的跟手是"阻尼 + 32px 硬封顶"
   （`LB_DRAG_DAMP` / `LB_DRAG_CAP`，它的舞台上任何时刻只有一张图、没有轨道可看），
   这里选的是"**1:1 跟手、拖过一张就夹住**"（= iOS 翻页 / `scroll-snap-stop: always`）。
   三个跟手候选（1:1 硬夹 / 灯箱式微跟手 / 只夹落点）都摆给主人看过，选的是第一个 ——
   **别再按灯箱的 damp+cap 去"统一手感"**，那会把拖动变成"拖 300px 画面走 30px"。

   落地（三处输入全走同一条规则，键盘 ←→ 与点侧卡本来就是 ±1 档，未动）：
     · 指针拖拽：跟手位置夹在「起点那一档 ± 一张」内（硬夹，无阻尼、无回弹）；
       落位以**手势起点那一档**为基准（不是"离当前位置最近"）—— 基准钉在起点，
       拖 2.5 张也只落相邻一张。轻甩（≥FLICK_V）仍能换一张，判据与 242 批一致。
     · 滚轮 / 触控板：手势起点取**档位**（上一段还在落位就取那一段的目标槽），
       累计位移硬夹 ±1 张；停滚落位同样以手势起点为基准。
     · 连续手势各算一段：手势结束把基准交还给落位目标 ⇒ 连甩两下 = 两张。
   参数覆盖：`?cpages=0` 关掉夹紧（回到 275 批的自由跟手），**只用于 A/B 取证**；
            `?cdebug=1` 的 window.__car() 多一枚 `paged` 布尔。
   验收：~/.workbuddy/scratch/pj-onecard-2026-09-26/onecard.js（含 ?cpages=0 反证）。


   第三百二十二批 2026-09-26 稍晚（主人「卡片滑动很不流畅」）：
   321 批的夹子**顶得太死**。探针实测（scratch/pj-onecard-2026-09-26/trace.js，1280 下 step=441）：

     手势                     输入     321 批导轨走了   输入继续、卡片已不动
     触控板持续推 1.2s        1200px      441px        1.2s 里只有前 22 帧在动（~70% 的帧是死的）
     滚轮连滚 8 格             960px      441px        后 4 格完全没有反应
     鼠标拖 700px              700px      441px        手指后 260px 白走
     （对照 ?cpages=0）        1200px     1200px       全程跟手 —— 这就是"流畅"的基准

   病根不是"一次一张"，是"**硬**"：位置一旦顶到界就再也不接受任何输入，而触控板的惯性尾巴
   还要再送 ~1s 的位移 —— 卡片在前 160ms 滑完一张，之后整整一秒纹丝不动。站里 274 批记录过
   同一个症状（"273 的硬夹一张让连续滚动 92% 的帧导轨不动"），当时的解法是把夹子整个拆掉
   （275 批）。这次不拆 —— 把"硬顶"换成"**逐渐顶不住**"：

     · 前 FOLLOW_KNEE（0.7 张）1:1 精确跟手（日常手势的可见段全在这里，手感与自由档逐帧相同）
     · 越过后按 C¹ 连续的饱和曲线渐近到「正好一张」：位置一直在动（惯性尾巴于是变成一段
       自然的"慢慢收起"），但**永远到不了一张之外**，所以落位仍然只可能是起点/相邻一张
     · 单调、无过冲、**永不后退** —— 与灯箱"到顶就不动，松手也不往回弹"同一个取舍
       （主人明确不喜欢回弹动画）；只是这里"到顶"改成"越来越慢"，不是"停死"

   不变式（探针逐条验过，见 322 批套件）：拖过半档 ⇒ 一定换一张（饱和只发生在半档之外，
   所以不会出现"拖了很远却弹回原卡"）；一张之内 1:1（`|rail - base| ≤ 0.7 step` 时误差 0）；
   `|rail - base| < step` 恒成立（封顶即"一次一张"本身）。
   **曲线形状是量出来的，不是拍的** —— 指数型与双曲型（WebKit 橡皮筋同族）都在浏览器里
   实现过、各跑了一遍 29 条套件（"死住"= 手势期间每帧位移 < 0.5px 的最长连续时长）：

                            自然快甩（日常动作）          持续推 1.2s（极端输入）
     指数型（本版）          死住 200ms · 卡片走 421px     死住 567ms
     双曲型                 死住 399ms · 卡片走 395px     死住 333ms

   取**指数型**：快甩才是主人的日常动作；双曲型的优势只出现在"1.2s / 1440px 输入"这种
   注定要被天花板吃掉的极端上（一次手势最多走一张 = 441px，而它送了 3.3 张）。
   膝盖也扫过一遍（0.4~0.8 × 两种形状）：取 0.7 还多一条理由 —— 半档落在 1:1 段内，
   "拖过半档就一定换一张"这条不变式最干净（膝盖 0.4 时输入半档、导轨只到 0.49 张，
   会落回 0，不变式就破了）。
  参数：FOLLOW_KNEE 一个常量，`?cpages=0` 仍回自由跟手（A/B）。 */
(function () {
  var root = document.getElementById('projectScenes');
  if (!root) return;
  var stage = root.querySelector('.pj-stage');

  /* === 项目数据（第二百批：图片卡，bg 由 p.img 全图覆盖；no/title 覆盖在图上）
     2026-08-30 接入真实项目：前两张为真实 GitHub 仓库（link 可点跳转，desc 副标题），
     后两张为「建设中」占位（标题「正在建设中」）；
     四张卡背景沿用现有四张角色图，不新增图片。 === */
  var PROJECTS = [
    { no: '01', title: 'my-first-repo', desc: '学习 Git & GitHub 的第一个仓库', img: 'https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/projects/castorice.webp?v=2', link: 'https://github.com/andyttc05/my-first-repo' },
    { no: '02', title: 'andyttc05.github.io', desc: '个人网站 · 你正看着的这个站点', img: 'https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/projects/hyacine.webp?v=2', link: 'https://github.com/andyttc05/andyttc05.github.io' },
    { no: '03', title: '正在建设中', img: 'https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/projects/evernight.webp?v=2', wip: true },
    { no: '04', title: '正在建设中', img: 'https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/images/projects/cyrene.webp?v=2', wip: true }
  ];

  /* 几何参数（第二百七十八批）：立牌影像排只跟 CSS 要**一个**数 —— 步距 --pj-step。
     卡片宽高、吊线长度、标签栏宽度全在 CSS 里（只影响观感），JS 不重复算一遍：
     skewed 时代 JS 还要读 rot/scale 才能复刻 CSS 的画法，现在缩放曲线写死在 render 里，
     两边不会再各说各话。 */
  var ST = 280;
  /* ── 步距怎么量（第二百八十四批重写）────────────────────────────────────
     **用探针元素量，不读 --pj-step 的字符串。**
     读自定义属性只有两条路：未注册时 getPropertyValue 回的是**未求值原文**
     （`calc(calc(calc(clamp(...))))`，parseFloat = NaN）；注册了才回 px 数。
     2026-09-16 实测过一次代价：style.css 里 @property 上方那段说明文字**漏了开注释符**，
     解析器把整段中文读成一条选择器、再把 @property 的 `{}` 吃成它的声明块 ⇒
     整条 @property 被丢掉 ⇒ 读回原文 → NaN → 兜底又跑在 render() 之前（那一刻 stage 里
     没有任何 .pj-scene，查询返回 null）⇒ ST 恒为 280px，而卡片实际宽 399px
     ⇒ **桌面端相邻卡片重叠 119px**，而且只有 resize 才重测，桌面端一直重叠没人发现。
     探针让引擎自己求值：`width: var(--pj-step)` 读 computed width。它不依赖注册、
     不依赖槽位是否建好、任何时刻都成立 —— 顺带把"测在建模之前"这个雷一起拆了。
     探针 5 个属性全写死（绝对定位到屏幕外、高 0、不可见、不吃事件），不留影响布局的可能。 */
  var probeEl = null;
  function stepProbe() {
    if (!probeEl) {
      probeEl = document.createElement('div');
      probeEl.setAttribute('aria-hidden', 'true');
      probeEl.style.cssText = 'position:absolute;left:-9999px;top:0;height:0;width:var(--pj-step)' +
        ';visibility:hidden;pointer-events:none';
      root.appendChild(probeEl);
    }
    return probeEl.getBoundingClientRect().width;
  }
  function measure() {
    var v = stepProbe();
    if (!isFinite(v) || v <= 0) {
      /* 二级兜底：连探针都拿不到（--pj-step 的表达式本身坏了）时按真实盒子量 ——
         卡宽 + 标签栏宽 + 2×间隙，与 CSS 里 --pj-step 的定义同式。
         ⚠️ 间隙必须**减掉卡宽**：rail 的 right 是 `calc(100% + gap)`，computed
         拿到的是"卡宽 + 间隙"的整体（实测 422px），直接当间隙用会算出天文数字。
         （这正是老代码那条兜底为何一次都没救回来 —— 它拿到 422 也是错的。） */
      var sc = stage.querySelector('.pj-scene');
      var rail = sc && sc.querySelector('.pj-scene__rail');
      if (sc && rail) {
        var railGap = 20;
        var rightPx = parseFloat(getComputedStyle(rail).right);
        if (isFinite(rightPx) && rightPx > sc.offsetWidth) railGap = rightPx - sc.offsetWidth;
        v = sc.offsetWidth + rail.offsetWidth + 2 * railGap;
      }
    }
    ST = (isFinite(v) && v > 0) ? v : 280;
  }
  function step() { return ST; }

  /* ── 贴纸落点表（第二百八十四批）────────────────────────────────────────
     主人要"贴的随意一点，有一种凌乱而规则的美"。**规则**由 CSS 管（每张贴纸都落在卡顶正中
     那一个区间里、尺寸一样、平涂一样）；**凌乱**就是这张表：四个项目四组具体落点。
     单位是**自身直径的百分比**（translate 的百分比按元素自身盒子算）——
     于是手机档贴纸缩到 32px 时，偏移自动跟着等比缩小，不用写第二张表。

     ⚠️ 为什么用显式表而不是序号哈希：上一版试过 FNV 哈希，连续序号算出来的低位字节彼此
     相关，偏移变成 −0.8 / +0.6 / +2.5 / +4.0 这种"顺序漂移"，看着像**贴歪了**而不是随手贴。
     "规则的凌乱"要的是四张都不一样的**具体**落点，那就把落点写出来。
     ⚠️ 三列都不许单调：x 正负交替、r 正负交替，这样"随手"才看得见。
     ⚠️ x 的幅度上限由**右上角那卷胶带**定：贴纸右缘不能压到它。
        实测桌面卡宽 365、贴纸 43px ⇒ 圆心可动范围远大于 ±23%，这一列是保守取。 */
  var WOBBLE = [
    { x: -21, y: -7, r: -5.5 },
    { x:   9, y:  5, r:  3.0 },
    { x:  23, y: -2, r:  6.5 },
    { x:  -7, y:  7, r: -2.5 }
  ];
  /* 把落点写进贴纸。translate 的 -50% -50% 是"圆心落在 left:50% / top:0"，
     再叠加表里的偏移；rotate 单独一个属性，与装配动画用的 scale 互不覆盖。 */
  function setStickerWobble(el, idx) {
    if (!el) return;
    var w = WOBBLE[((idx % WOBBLE.length) + WOBBLE.length) % WOBBLE.length];
    if (el._wob === w) return;                     /* 同元素复用时不重复写 inline */
    el._wob = w;
    el.style.translate = 'calc(-50% + ' + w.x + '%) calc(-50% + ' + w.y + '%)';
    el.style.rotate = w.r + 'deg';
  }

  /* ── 一次手势 = 一张（第三百二十一批，规则与推导见文件头 321 批）─────────────
     三个小函数就是这条规则的全部：
       originSlot(v)                 把任意位置折算成它所在的那一档
       railClamp(pos, base)          跟手位置收进「base ± 一张」（第三百二十二批：不是硬夹，
                                     是前 0.7 张 1:1、之后渐近饱和 —— 到顶是"越拖越沉"，
                                     不是"停死"，且永不后退、不回弹，与灯箱同一个取舍）
       pageLanding(base, pos, vel)   落位目标 = base + k·一张，|k| ≤ 1
     base 一律是**手势起点那一档**，不是"离当前位置最近的一档" —— 基准一漂，
     拖 2.5 张就会落 2~3 张（275 批就是这样）。
     `?cpages=0` 关掉夹紧（回 275 批的自由跟手），只用于 A/B 取证。 */
  var PAGE_PER_GESTURE = !/[?&]cpages=0/.test(location.search);
  var FLICK_V = 0.6;        /* 轻甩判据 px/ms（第二百四十二批起，拖拽落位沿用） */
  /* 跟手膝盖（第三百二十二批）：一张之内这个比例是 1:1 精确跟手，越过后开始饱和。
     0.7 的量法：1280 下 step=441 ⇒ 前 309px 逐帧 1:1（触控板一次自然的手指出力 ≈240px、
     全部落在这一段里，所以"跟手"的观感与自由档完全一样），再往后的惯性尾巴把卡片从
     0.7 张慢慢收到 1 张 —— 尾巴于是成了"滑行收起"，而不是"死在一张处"。 */
  var FOLLOW_KNEE = 0.7;
  function originSlot(v) {
    var st = step();
    return Math.round(v / st) * st;
  }
  /* 跟手位置 → 实际位置（第三百二十一批的"一次一张"，第三百二十二批改成饱和版）：
       |d| ≤ knee·st   → 原样（1:1 跟手）
       |d| > knee·st   → base ± st·(1 − (1−knee)·e^(−(u−knee)/(1−knee)))，u = |d|/st
     （指数型。双曲型（WebKit 橡皮筋同族）也实现过、也量过：自然快甩上它死住 399ms
       vs 这里的 200ms，所以没用它 —— 两种形状的实测对照见文件头 322 批。）
     这条曲线在 u = knee 处**函数值与斜率都连续**（C¹，所以看不到折点），且
       · 单调不减、值域 [0, st) —— 永不后退、永不超过一张（"一次一张"由它保证）
       · 导数在 knee 处恰为 1（不减速突变），之后单调减到 0 —— 观感是"越拖越沉"
     为什么不用硬夹：硬夹在界外的导数恒为 0 ⇒ 界外的输入全被丢掉，触控板的惯性尾巴还要再
     送 ~1s 的位移，于是卡片滑完一张就死住整整一秒（322 批实测 ~70% 的帧是死的 = 主人说的
     "很不流畅"）。饱和曲线让"界外"仍有响应，只是响应越来越小。
     ⚠️ 别改回 `if (pos > base + st) return base + st;` —— 那正是 322 批要治的那版。 */
  function railClamp(pos, base) {
    if (!PAGE_PER_GESTURE) return pos;
    var st = step();
    var d = pos - base;
    var ad = Math.abs(d);
    if (ad <= st * FOLLOW_KNEE) return pos;
    var u = ad / st;
    var tail = 1 - FOLLOW_KNEE;                    /* 界外留给饱和曲线铺开的空间（张） */
    var sat = st * (1 - tail * Math.exp(-(u - FOLLOW_KNEE) / tail));
    return base + (d < 0 ? -sat : sat);
  }
  function slotAnchor() {
    /* 手势起点那一档。上一段还在落位（FIN）或还在指数逼近（raf 且未落位）时，
       取那一段的**目标** —— 起点若按"此刻的 x"算会被算成"这一段已经走了一部分"，
       连甩第二下就走不动（Swiper 的 thresholdTime 那族补丁栽在这里）。 */
    var v = FIN ? FIN.to : (raf ? xTarget : x);
    return originSlot(v);
  }
  function pageLanding(base, pos, vel) {
    var st = step();
    var k = Math.round((pos - base) / st);
    if (k > 1) k = 1; else if (k < -1) k = -1;
    if (k === 0 && Math.abs(vel) >= FLICK_V) k = vel > 0 ? 1 : -1;   /* 轻甩也算换一张 */
    return base + k * st;
  }
  var CAR_DEBUG = /[?&]cdebug=1/.test(location.search);

  var n = PROJECTS.length;
  var slots = [];           /* 活动槽位 {j, el} */
  var pool = [];            /* 空闲元素池 */
  var RENDER_RANGE = 2.4;   /* 单位：step —— 新曲线 1.75 档就淡到 0，±2.4 足够留边缘缓冲 */
  /* 点击命中阈值（修复"连点 +2 卡不连续"）：连点 +2 时第二次点击常落在动画中途，
     命中卡 u ∈ (2.05, 2.44]，原 2.05 阈值把它当边缘缓冲卡忽略 → 连点只走一格。
     +1 卡中途命中 u≈1.2-1.8 不受影响；几何上包含 +2 光标点的卡 u 最大 2.44，
     u=3 才透明度归零 —— 3.0 覆盖全部可见/半透明卡，且不误伤不可见卡。 */
  var CLICK_MAX_U = 2.4;   /* 点得到的最大离中心步数：新设计里 >1.75 档已全透明，
                              2.4 = 只在"看得见"的范围内允许点击命中（不可见卡不该可点） */
  /* 第二百七十批（主人"为什么现在+1/+2卡片不能点击"）：点击抖动容差 ——
     真实鼠标按下瞬间普遍带 8~30px 位移（按键压力/手抖），一旦超过 8px 拖拽接管
     阈值就被当成拖动；低速松开又按"未过半档"弹回原位 → 卡片纹丝不动，观感
     "点不动"。按下未拖远（≤CLICK_SLOP）且松手速度低（<0.5px/ms）= 抖动点击，
     一律居中按下时的卡；真拖（>24px）或高速轻甩（≥0.5px/ms）不受影响。 */
  var CLICK_SLOP = 24;
  /* "离散跳一档"的舒缓展示系数（第二百六十三批，原变量名 AUTO_K —— 第二百八十一批
     更名：自动轮播已移除，它从来只服务**主人触发**的跳档操作）。0.15 @60Hz ≈
     0.45~0.5s 优雅减速，卡片倾斜/缩放动效全程可见。适用范围：点击侧卡居中 +
     键盘 ←→；拖拽松手 / 停滚落位另走三次 Hermite 曲线（第二百六十九/七十一批：
     0.25s / 0.35s 平滑落位），不读本系数。 */
  var STEP_K = 0.15;
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
  var dragOriginSlot = 0;    /* 第三百二十一批：本手势起点那一档（跟手夹紧与落位的共同基准） */
  var dragEngaged = false;   /* 第二百三十一批：拖动是否真正开始（位移 >8px） */
  var dragTarget = 0, dragRaf = null;   /* 拖动目标 + rAF 平滑循环（第二百五十九批恢复） */
  var dragLastT = 0;          /* 第二百六十八批：拖动循环帧率无关化 —— rAF 时间戳折算 60Hz */
  /* 第二百六十九批：dragTick 逐帧测卡片实际速度（px/s），供松手弹簧继承初速度 */
  var dragVel = 0, dragPrevX = NaN, dragPrevT = 0;
  var velSamples = [];        /* 拖拽期最近 ≤100ms 采样（{t, x}），用于松手释放速度 */

  function wrapIdx(i) { return ((i % n) + n) % n; }

  /* 图到位那一下的交接（2026-09-21 全站同步空图片底板）：换项目时改的是**同一个 img
     的 src**（槽位池化复用），新图没到之前帧里显示的是 .pj-scene__frame 的底板
     （--plate-*），到了不该硬切 —— 和相簿 / 动态页 / 首页立绘同一套 0.4s 淡入（--img-fade）。
     ⚠️ 每次换 src 都要**重置**状态：这里是复用节点，不是新建，不清掉 .is-loaded 就淡不起来。
     三路兜底（complete / load / error）见 photos.js 的 fadeIn 注释。 */
  function fadeInImage(img) {
    img.classList.remove('is-loaded');
    img.classList.add('is-pending');
    var done = function () {
      img.classList.remove('is-pending');
      img.classList.add('is-loaded');
    };
    if (img.complete) { done(); return; }
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
  }

  /* 预加载全部卡图：槽位复用换图时浏览器缓存秒切，不闪白；decode() 提前解码 ——
     回弹/步进时新卡入环不再触发"解码抖动"（第二百二十四批 主人"回弹有时像卡住"） */
  PROJECTS.forEach(function (p) {
    var im = new Image();
    im.src = p.img;
    if (im.decode) im.decode().catch(function () {});
  });

  /* 立牌 DOM（池化复用：出界回池、进界取用）。**两层**，各管一件事：
       .pj-scene         位移（+透明度）—— 每帧写 translateX
       .pj-scene__swing  摆动（transform-origin = 卡顶正中 = 贴纸圆心）
         .pj-scene__zoomer 缩放（origin 50% 0，同一个点）→ 标签栏 + 明信片
     第二百八十四批：**挂具层（.pj-scene__hang + .pj-scene__pin）整段撤掉** —— 主人"移除钉头，
     只用贴纸是不是比较好"。原来叠四件（绳 + 绳圈 + 气眼 + 钉头）→ 只留一枚钉 → 现在连钉也没有，
     改成**序号贴纸直接"粘"在卡顶正中**（贴纸是 .pj-scene__card 的子元素，见 SCENE_HTML 下方）。
     所以 swing 下面直接就是 zoomer，少一层；也不再需要"有个实物不该跟着卡片缩"这个理由 ——
     贴纸是卡片表面上的东西，本来就该跟着缩。
     几何仍然全交给 CSS：摆动轴心 = 缩放不动点 = 卡顶正中（`50% 0`），JS 一行几何都不算
     （与第二百八十批同一个理由）。贴纸自己的落点偏移是唯一由 JS 写的东西，走独立属性
     translate / rotate（不是 transform），免得和装配动画争 —— 见 setStickerWobble。 */
  var SCENE_HTML =
    '<div class="pj-scene__swing">' +
      '<div class="pj-scene__zoomer">' +
      '<div class="pj-scene__rail" aria-hidden="true">' +
        '<span class="pj-scene__rail-dot"></span>' +
        '<span class="pj-scene__rail-eyebrow"></span>' +
        '<span class="pj-scene__rail-line"></span>' +
        '<span class="pj-scene__rail-title"></span>' +
      '</div>' +
      '<div class="pj-scene__card">' +
        '<span class="pj-scene__tape" aria-hidden="true"></span>' +
        '<span class="pj-scene__sticker" aria-hidden="true"></span>' +
        '<div class="pj-scene__frame">' +
          '<img class="pj-scene__image" alt="" decoding="async" draggable="false">' +
        '</div>' +
        '<div class="pj-scene__band">' +
          '<svg class="pj-scene__doodles" viewBox="0 0 720 96" fill="none" preserveAspectRatio="none" aria-hidden="true">' +
            '<path class="pj-scene__doodle-pencil" d="M46 70q13-10 26 0t26 0"/>' +
            '<circle class="pj-scene__doodle-pencil" cx="196" cy="30" r="7"/>' +
            '<path class="pj-scene__doodle-pencil" d="M556 74l24-5m10-4 16-3"/>' +
            '<path class="pj-scene__doodle-accent" d="M660 22l4 10 10 4-10 4-4 10-4-10-10-4 10-4z"/>' +
          '</svg>' +
          '<p class="pj-scene__caption"></p>' +
        '</div>' +
        '<span class="pj-scene__stamp">' +
          '<span class="pj-scene__stamp-text"></span>' +
          '<svg class="pj-scene__stamp-art" viewBox="0 0 104 10" fill="none" aria-hidden="true">' +
            '<path class="pj-scene__stamp-flourish" pathLength="1" d="M2 7q22-6 44-1t56-3"/>' +
          '</svg>' +
        '</span>' +
      '</div>' +
      '</div>' +
    '</div>';

  /* 逐帧渲染：遍历当前可见槽位 [jmin, jmax]，出界回池、进界取用，
     每槽按距中心连续距离写 transform/opacity/z-index。
     （第二百四十批撤掉的内容滞后动效留下的"清残留"循环随本次重写一并删除：
       新结构里没有 media/inner 两层，池复用只需清 _zi/_active/_txt 三个缓存。） */
  /* ── 装配动画只在"导轨静止"时起跑（2026-09-17 修"快速滑动时蓝色数字连续快速播放"）──
     实测（scratch/pj-enter-2026-09-17/probe-enter2.js，1440×900，step 451）：
       · 单步 1 档：pj-stick 起 1 / 完 1 / 被杀 0     ← 正常
       · 持续快滑 1.6s（1.5px/ms，穿过 7 张卡）：起 6 / 完 1 / **被杀 5**
       · 更猛（5px/ms，穿过 22 张卡）：起 1 / 完 1 / **被杀 14**（卡在中心只停 ~55ms，
         连 pj-stick 那 0.1s 的延迟都没到 ⇒ 只有 cancel 没有 start）
       · 拖拽快甩：起 1 / 完 1 / 被杀 0              ← 正常
     即：卡在中心只停 55~230ms，而装配是带 0.05~0.5s 错峰延迟、最长一件要 0.92s 的
     一串动画 ⇒ 每一件都"刚起跑就随 is-enter 被摘掉而取消"。肉眼就是蓝色序号贴纸
     一张接一张弹起又半路消失（主人报的"连续快速播放"）。
     成因不是设计错，是设计意图与场景冲突：**"成为主角时播一次"**在"主角每 ~200ms
     换一张"时无解。缺的只是"什么时候算真的到了" —— 导轨**静止**才叫到了。
     ⇒ 飞行中成为主角的卡不挂 is-enter，只记一笔 pendingEnter，等导轨**静止**了再补播。
     静止时再没人摘它，所以**结构上不可能再出现半路取消**（不是把阈值调小、不是调快动画）。
     静止判定全部用现成状态（拖拽 / 滚轮 / 落位曲线 / 两个 rAF 循环 / 目标未到位），
     不引入任何新参数、不做速度采样。
     ⚠️ 补播**不能只挂在 render 末尾**：滚轮停手后 wheeling 还要 120ms 才落下（wheelEnd），
     而 rAF 循环在 ~80ms 就收敛退出 ⇒ 收敛那一帧 wheelEnd 还没跑、判"未静止"，
     之后再没有任何东西调 render ⇒ 补播永远不发生（实测：单步 1 档变成**一个动画都不播**）。
     ⇒ 用一条**只在有 pending 时存在、播完即止**的重试链兜住，不依赖任何调用点被记得。
     （第二百八十六批把这条链从 90ms 定时器改成逐帧 rAF：起跑阈值细化到 50ms 静默 +
       0.2 档之后，90ms 的粒度会把省下的时间又还回去。） */
  var pendingEnter = null, enterRaf = null;
  /* 第二百八十六批的两个常量（推导见文件头 286 批）：
     ENTER_QUIET —— 滚轮静默多少毫秒算"手停了"；它是"不误播"的唯一闸门。
     ENTER_NEAR  —— "差不多到位"的判据（单位：档）。0.2 档 ≈ 落位曲线剩余 ~100ms。 */
  var ENTER_QUIET = 50;
  var ENTER_NEAR = 0.2;
  /* 最近一次滚轮事件时刻（performance.now() 钟，与 rAF 同源）。-1e9 = "从来没有过"，
     于是首屏那次 render() 不会被静默判据挡住。 */
  var lastWheelT = -1e9;
  /* 第二百八十六批：装配起跑。三条缺一不可 —— 手停了 / 目的地已定 / 离目的地 ≤0.2 档。
     **它包含老的 railResting()**（导轨真的不动了 ⇒ dest 已到位 ⇒ |dest−x|=0），
     所以那条"整条导轨静止"的判据整段撤掉，不再有两套话说同一件事。
     不看 `wheeling`：它是"手势结束"（W_IDLE=120ms 静默才敢下的结论），
     而装配要等的是"这张主角到位"；也不看 `raf` / `FIN` 是否在跑：落位曲线的最后
     ~100ms 正是要重叠进去的那一段。 */
  function railCanEnter() {
    if (dragging) return false;                                  /* 手指还按着 */
    if (performance.now() - lastWheelT < ENTER_QUIET) return false;   /* 还在滚 */
    var st = step();
    var dest = FIN ? FIN.to : xTarget;      /* 落位曲线的终点 / 指数逼近的目标 */
    if (Math.abs(dest - Math.round(dest / st) * st) > 1) return false;  /* 目的地不在档位上 */
    return Math.abs(dest - x) <= ENTER_NEAR * st;
  }
  function enterStart(el) {
    void el.offsetWidth;
    el._enterT = performance.now();
    el.classList.add('is-enter');
  }
  /* 第二百八十六批：摘 is-enter 从"立即"改成"播完再摘" —— 起跑提前后必然多出
     "起跑后又被滑走"的场合，直接摘类会让动画**瞬间跳回静止态**（2026-09-17 报的
     "半路消失"）。所有装配动画的收尾值本来就等于静止态（见文件头 286 批），
     所以留着播完看不见任何跳变。ENTER_MS 取最长一件（pj-char 尾字 0.2+i×0.022+0.36
     ≈ 1.0s）加余量。 */
  var ENTER_MS = 1100;
  function clearEnter(el) {
    if (el._enterOff) { clearTimeout(el._enterOff); el._enterOff = null; }
    el._enterT = 0;
    el.classList.remove('is-enter');
  }
  function dropEnter(el) {
    if (!el.classList.contains('is-enter')) { el._enterT = 0; return; }
    var left = el._enterT ? ENTER_MS - (performance.now() - el._enterT) : 0;
    if (left <= 0) { clearEnter(el); return; }
    if (el._enterOff) clearTimeout(el._enterOff);
    el._enterOff = setTimeout(function () { el._enterOff = null; clearEnter(el); }, left);
  }
  /* schedule=false：render 末尾用，能起跑才播，不动定时器。
     schedule=true ：被推迟时用，**逐帧**重试直到能起跑（自终止）。
     第二百八十六批：原来是 90ms 定时器 —— 新的 ENTER_QUIET=50ms 比 90ms 细，
     粗粒度会把"静默够了"这件事白等到 90~140ms 才兑现（等于把省下的时间还回去）。 */
  function flushEnter(schedule) {
    if (!pendingEnter) {
      if (enterRaf) { cancelAnimationFrame(enterRaf); enterRaf = null; }
      return;
    }
    if (!railCanEnter()) {
      if (schedule && !enterRaf) {
        enterRaf = requestAnimationFrame(function () { enterRaf = null; flushEnter(true); });
      }
      return;
    }
    if (enterRaf) { cancelAnimationFrame(enterRaf); enterRaf = null; }
    var pe = pendingEnter;
    pendingEnter = null;
    enterStart(pe);
  }
  /* 先摘类 → 强制重排 → 再挂上，否则同一个元素的动画不会重播（原逻辑，未动）。 */
  function playEnter(el) {
    if (railCanEnter()) { pendingEnter = null; enterStart(el); return; }
    pendingEnter = el;
    flushEnter(true);
  }

  function render() {
    var st = step();
    var jmin = Math.ceil((-RENDER_RANGE * st - x) / st);
    var jmax = Math.floor((RENDER_RANGE * st - x) / st);
    for (var k = slots.length - 1; k >= 0; k--) {
      if (slots[k].j < jmin || slots[k].j > jmax) {
        /* 回池前把状态类摘干净：is-active 会带 z-index:2、is-enter 会带一整套装配动画 ——
           元素在池里躺着时还留着这些，复用到新槽位就会"带着上一张的装扮出场"
           （第二百七十八批实测：主角计数偶尔出现 2 个，就是池里那张没摘 is-active）。 */
        var pel = slots[k].el;
        pel.classList.remove('is-active');
        clearEnter(pel);   /* 第二百八十六批：回池前立刻摘干净（不许把上一张的装扮带出去） */
        pel._active = false;
        if (pendingEnter === pel) pendingEnter = null;
        pool.push(pel);
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
          el.className = 'pj-scene';
          el.innerHTML = SCENE_HTML;
          stage.appendChild(el);
        }
        var p = PROJECTS[wrapIdx(j)];
        var img = el.querySelector('.pj-scene__image');
        if (img.getAttribute('src') !== p.img) {
          img.setAttribute('src', p.img);
          img.alt = p.title;
          if (img.decode) img.decode().catch(function () {});   /* 换图提前解码防抖动 */
          fadeInImage(img);                                     /* ← 新图到位淡入（见上） */
        }
        /* 文字：眉标 = 类型、竖排标题 = 项目名、贴纸与印章 = 序号。
           类型只从数据推（有链接 = REPO / 建设中 = DRAFT），不为好看编造分类；
           参考站那个"日期"位换成 序号/总数 —— 项目数据里没有可靠日期，不编。 */
        el.querySelector('.pj-scene__rail-eyebrow').textContent = p.link ? 'REPO' : 'DRAFT';
        el.querySelector('.pj-scene__rail-title').textContent = p.title;
        el.querySelector('.pj-scene__sticker').textContent = p.no;
        /* 贴纸落点：按**项目序号**取偏移（不是槽位 j）—— 回绕时同一项目永远是同一个落点，
           否则卡片绕一圈回来贴纸会换位置（"贴着玩"变成"在飘"）。 */
        setStickerWobble(el.querySelector('.pj-scene__sticker'), wrapIdx(j));
        el.querySelector('.pj-scene__stamp-text').textContent = p.no + ' / ' + (n < 10 ? '0' : '') + n;
        /* 说明逐字拆 span：CSS 用 --i 做错峰落下（参考站同款逐字入场） */
        var cap = el.querySelector('.pj-scene__caption');
        var txt = p.desc || p.title;
        if (cap._txt !== txt) {
          cap._txt = txt;
          cap.textContent = '';
          for (var ci = 0; ci < txt.length; ci++) {
            var ch = document.createElement('span');
            ch.className = 'pj-scene__caption-char';
            ch.style.setProperty('--i', ci);
            ch.textContent = txt.charAt(ci);
            cap.appendChild(ch);
          }
        }
        el.classList.toggle('has-link', !!p.link);
        /* 第 2、4 张吊起来（参考站 5 张里 2 张 raised，同节奏）。
           按**项目序号**定而不是槽位 j：回绕时不会翻面。 */
        el.classList.toggle('pj-scene--raised', wrapIdx(j) % 2 === 1);
        /* 缩放层（每帧写 scale）。与 _zi/_active/_txt 一样跟着元素一起复用。 */
        el._zoom = el.querySelector('.pj-scene__zoomer');
        slot = { j: j, el: el, img: img };
        slots.push(slot);
      }
      var m = j * st + x;             /* 槽位屏幕位置（无回绕 —— 循环靠槽位进出） */
      var t = m / st;                 /* 距中心步数（小数，连续） */
      var u = Math.abs(t);
      /* 第二百一十三批（主人"点击背后左右的卡片移到该卡片"）：槽位 j 与可见度
         u 记到元素上，供 stage 点击事件委托判断 —— 点击侧卡 → 该卡居中 */
      slot.el._slotJ = j;
      slot.el._slotU = u;
      /* 第二百七十八批：曲线换成参考站立牌的**实测**值（tblog-scenes4.js 逐档采样）——
           当前张 scale 1 / opacity 1，邻张 0.94 / 0.4 → 0
           scale   = 1 − 0.06·min(1, u)         （过了 1 档恒 0.94）
           opacity = clamp(1 − 0.57·u, 0, 1)    （≈1.75 档归零，比旧版 [2,3] 收得早）
         即"一张主角 + 旁边那张正在淡出"。skewed 时代那套 rotateY/smoothstep 曲线与
         ±1/±2 的 0.85/0.70 透明分级随设计一起撤掉 —— "±2 也要看清"不再是本页的诉求。
         第二百八十批：**缩放从 .pj-scene 挪到内层 .pj-scene__zoomer**（位移还在 scene 上），
         因为吊线是一根**静止的**横线：整张牌连吊环一起缩，邻居的环就会从线上脱开
         （实测 1280：邻居环比线低 13.4px，一眼就是"没挂上去"）。挪到内层后
         zoomer 的 transform-origin 取 50% 0 = 卡顶正中 = **吊点**，吊点是不动点 ⇒
         吊环永远落在线上、绳长不变，邻居只是"从吊点往下小一圈"（物理上也更对：
         挂在同一根线上的小牌，顶边当然还是齐着线）。曲线本身一个数没改。 */
      slot.el.style.transform = 'translateX(' + m + 'px)';
      slot.el._zoom.style.transform = 'scale(' + (1 - 0.06 * Math.min(1, u)).toFixed(3) + ')';
      slot.el.style.opacity = Math.max(0, 1 - 0.57 * u).toFixed(3);
      var zi = Math.max(0, 2 - Math.round(u));
      if (slot.el._zi !== zi) { slot.el._zi = zi; slot.el.style.zIndex = zi; }
      var active = u <= 0.5;
      if (slot.el._active !== active) {
        slot.el._active = active;
        slot.el.classList.toggle('is-active', active);
        /* 入场装配只在新成为主角时播一次。必须"先摘类 → 强制重排 → 再挂上"，
           否则同一个元素的动画不会重播；邻居不动 —— 整排一起抖就是主人最烦的多余动作。 */
        /* 第二百八十六批：起跑见 railCanEnter；离开主角位时**不立刻摘** —— 让它播完
           （dropEnter），否则起跑提前后会看见装配"啪"地跳回静止态。 */
        if (active) { clearEnter(slot.el); playEnter(slot.el); }
        else { dropEnter(slot.el); if (pendingEnter === slot.el) pendingEnter = null; }
      }
    }
    /* 补播：飞行中被跳过装配的那张，等导轨真的停了再给它一次。此刻没有任何输入
       在跑 ⇒ 这一遍必然完整播完（这里只试不排期，排期由 playEnter 那条自终止链管）。 */
    flushEnter(false);
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
  /* 第二百七十六批 2026-09-13（主人"快速滑动卡片，卡片慢慢停下的动画出现卡顿和不流畅"）：
     落位动画从**临界阻尼弹簧**（第二百六十九/七十一批）换成**有限时长三次 Hermite
     曲线（ballistic finish）**。取证脚本 scratch/carousel-sim/v276-jank.js /
     v276b-trace.js / v276c-traj.js（逐帧采 window.__car() + CDP tracing）：
       · **主线程不是瓶颈**：rAF 回调实测 0.10ms/帧、Paint 0.04ms/帧、153 帧里
         PrePaint 共 5.5ms，headless 全程零掉帧（去掉 blur / mask / will-change
         / box-shadow 四个对照组也一样）。所以"卡顿"不是丢帧，是**运动曲线本身**。
       · 弹簧 ω=18 落 129.5px **实测 533ms**（设计意图 ~0.35s），其中**后 8 帧
         （133ms）每帧位移 <0.5px** —— 指数尾巴：位移趋近 0 却永远到不了，肉眼就是
         "停住不动、动画又没结束"，正是"慢慢停下时卡顿"的来源。
       · 旧流程还有**两次停顿**：滚轮事件一停，目标冻结 → 导轨 2~3 帧内贴住目标
         硬停 → 120ms 静默 → 弹簧**再从静止起弹**（首帧就 11.7px/700px/s）。
         硬停 + 重启 = 观感"顿一下"。
     新曲线一条公式同时解决三件事：
         p(s) = (3s² − 2s³) + u0·s(1−s)²          s = t / T ∈ [0,1]
         三次 Hermite 边值：p(0)=0, p(1)=1, p'(0)=u0, p'(1)=0。
         · u0 = 0 → smoothstep：静止起步，缓慢加速再缓慢减速 —— 不冲、不"顿"
           （惯性尾巴已经死掉的快甩走这条：曲线初速 = 0，不再是"停住又窜一下"）
         · u0 → 3 → 纯减速：从**当前速度**开始单调减速到 0，速度连续、无断裂
           （鼠标滚轮一梭子推完、或拖拽带着速度松手走这条）
         · 单调性：p'(s) = (1−s)[6s + u0(1−3s)]，u0 ∈ [0,3] 时恒 ≥0
           → **结构上不可能过冲**（第二百四十二/二百五十五批"无过冲、无回弹"
             由数学保证，不是靠调参）；u0 取上限 2.8 留余量
         · s=1 精确到位、有限时长 —— **没有指数尾巴**，爬行帧实测 ≤2 帧（33ms）
     时长 T = clamp(3·D / max(|v0|, VFLOOR), TMIN, TMAX)：
       3D/v0 恰好让曲线初速 = 释放速度（速度连续）；尾巴已死（|v0| 很小）时落到
       TMAX，此时 u0≈0 → smoothstep 慢起慢落。 */
  var FIN = null;              /* {t0, from, to, T(ms), u0, v0} —— 落位曲线状态 */
  var lastFinV0 = 0;           /* 最近一次落位用的实测初速 px/s（调试口用） */
  var FIN_TMAX_WHEEL = 320;    /* 停滚落位 最长 ms（旧弹簧 ω=18 意图 ~0.35s，实测收紧） */
  var FIN_TMAX_DRAG = 260;     /* 拖拽松手 最长 ms（旧弹簧 ω=22 意图 ~0.25s，保持更干脆） */
  var FIN_TMIN = 140;          /* 最短 ms（防"高速 + 只差几 px"变成撞墙式硬停） */
  var FIN_VFLOOR = 250;        /* 初速很小时假定的速度 px/s —— 决定 u0，越小越"慢起" */
  var FIN_U0MAX = 2.8;         /* u0 上限（<3 保单调、保无过冲，见上） */
  function tick(ts) {
    raf = null;
    if (FIN) {
      var f = FIN;
      /* 首帧回填一个帧长，避免"起手先空转一帧"（旧弹簧同款处理） */
      if (!f.t0) f.t0 = ts - 16.6667;
      var u = (ts - f.t0) / f.T;
      if (u >= 1) {
        FIN = null; lastFrameT = 0; x = xTarget = f.to; render(); return;
      }
      var s = u, s2 = s * s, om = 1 - s;
      var p = (3 * s2 - 2 * s2 * s) + f.u0 * s * om * om;   /* 三次 Hermite，见上 */
      x = xTarget = f.from + (f.to - f.from) * p;
      render();
      raf = requestAnimationFrame(tick);
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
    FIN = null;      /* 第二百七十六批：拖动接管时清掉落位曲线（若正在落位） */
    lastFrameT = 0;
  }

  /* animateTo：设置目标并确保动画循环在跑；运行中再次调用只改目标（不打断）。
     k 缺省 0.6（吸附）；触控板连滚跟手传 0.9。
     第二百六十九批：animateTo 取消进行中的落位动画（点击/键盘/滚轮/自动接管）。 */
  function animateTo(target, k) {
    cancelCoast();
    FIN = null;
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
     第二百七十五批：落位基准回到"离**当前位置**最近的一档" —— 夹紧撤掉后，
     一次手势能滑几张就滑几张（拖 2.5 张 → 落 2 或 3 张）。
     第三百二十一批：基准改回**手势起点那一档**（pageLanding）—— 一次手势只走一张，
     见文件头 321 批。 */
  function snapToSlot() {
    var st = step();
    animateTo(Math.round(x / st) * st);
  }
  function snapFromDrag(vel) {
    /* 第二百五十五批：速度只决定目标档位，不注入位移（跟手、无滑过头回拉）。
       第二百七十六批：落位从弹簧改三次 Hermite 曲线（见文件头 276 批）。
       初速用**指针尾速 vel（px/ms → ×1000）**，不是 dragVel —— 实测：松手前
       只要有 ≥1 帧，dragTick 就已追上指针并走"收敛退出"分支把 dragVel 清零
       （第二百七十二批的刻意行为），于是"快甩松手"永远拿到 v0=0、落位从静止
       起弹。而 vel 来自 velSamples 的**松手前 ≤40ms 指针采样**，自带"手指是否
       已经停住"的判定：手指停住再松手 → vTail=0（且 dragVel 也已清零）→ vel=0
       → u0≈0 慢起（272 批那条不变式保住）；移动中松手 → vel 就是手指速度
       ≈ 卡片速度（跟手 1:1，稳态速度相同）→ 曲线从该速度单调减速。 */
    var st = step();
    var nearest = Math.round(x / st) * st;
    var dx = x - nearest, dir = 0;
    if (Math.abs(dx) >= st / 2) dir = dx > 0 ? 1 : -1;       /* 拖过半档 */
    else if (Math.abs(vel) >= FLICK_V) dir = vel > 0 ? 1 : -1;   /* 轻甩 */
    /* 第三百二十一批：落位以**手势起点那一档**为基准（pageLanding）⇒ 一次手势只走一张。
       ⚠️ 基准不许改成"离当前位置最近"（275 批那条）：跟手被夹在起点 ±1 张之后，
       这两个基准在多数情况下同值，但**手势中途 x 被夹紧/被落位曲线拉走**时就分岔，
       分岔的方向是"多走一张"。`?cpages=0` 走下面那条老式子（只用于 A/B）。 */
    var target = PAGE_PER_GESTURE ? pageLanding(dragOriginSlot, x, vel) : nearest + dir * st;
    startFinish(target, vel * 1000, FIN_TMAX_DRAG);
  }
  /* startFinish：落位到 target 的有限时长曲线（第二百七十六批取代 releaseSpring）。
     v0 = 出发瞬间的速度（px/s，正负与 x 同向）：
       - 背向速度丢掉（不清零会先反向减速再掉头，观感"顿"）
       - |v0| 只用来定曲线形状与时长，不注入额外位移
     不变式（由 T = clamp(3D/|v0|, TMIN, TMAX) 与 u0 ≤ 2.8 共同保证）：
       **曲线初速 = u0·D/T ≤ |v0|** —— 任何情况下都不会"起手比来速还快"（不窜）。
     曲线形状、单调性、无过冲证明见文件头 276 批。 */
  function startFinish(target, v0, tmax) {
    if (raf) { cancelAnimationFrame(raf); raf = null; }   /* 换模式需重启循环 */
    lastFrameT = 0;
    var D = target - x, ad = Math.abs(D);
    if (ad < 0.5 && (!isFinite(v0) || Math.abs(v0) < 40)) {
      FIN = null; x = xTarget = target; render(); return;
    }
    var vIn = (isFinite(v0) && v0 * D > 0) ? Math.min(Math.abs(v0), 4000) : 0;
    var T = Math.round(Math.min(tmax, Math.max(FIN_TMIN, 3000 * ad / Math.max(vIn, FIN_VFLOOR))));
    lastFinV0 = vIn;
    FIN = { t0: 0, from: x, to: target, T: T, u0: Math.min(FIN_U0MAX, vIn * (T / 1000) / ad), v0: vIn };
    xTarget = x;   /* 曲线期间指数目标无意义 —— 同步到当前防兜底读到陈旧值 */
    raf = requestAnimationFrame(tick);
  }

  /* 键盘 ←/→（轮播聚焦时）：与点击侧卡同为"离散跳一档"，统一用舒缓系数
     STEP_K（0.15，≈0.45~0.5s 优雅滑行） */
  root.tabIndex = 0;
  root.addEventListener('keydown', function (e) {
    if (dragging) resetDrag();   /* 第二百六十四批：拖拽态失联时键盘先接管 */
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev(STEP_K); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); next(STEP_K); }
    lastInputT = Date.now();   /* 第二百六十六批 */
  });

  /* 拖拽（pointer events，横向跟手）：按下取消动画/滑行 → 直接改 x →
     松手按释放速度惯性滑行后吸附（第二百零五批，见 startCoast）。 */
  function setDraggingClass(on) {
    /* 2026-08-30：is-dragging 同时打到 stage —— 拖住卡片外空白处（可拖动区域）
       时也显示 grabbing，不只在卡片上拖动才变手型 */
    stage.classList.toggle('is-dragging', on);
    for (var i = 0; i < slots.length; i++) slots[i].el.classList.toggle('is-dragging', on);
  }
  stage.addEventListener('pointerdown', function (e) {
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
    /* 第二百二十九批：记录"按下时"命中的槽位（连点/卡片移动中点击，松手时卡片可能
       已移走、elementFromPoint 会命中错误目标）—— 点击意图以按下瞬间为准。
       第二百三十二批（主人"点左边不如右边丝滑 / +2 卡动画方向不对"）：必须按
       "槽位"（点击的那张具体副本）而非卡号 —— ±2 槽位是同一张卡（C 重复显示在
       两侧），按卡号会把左右两张 C 当成同一个，点左边 C 却去居中右边那张、
       带子往左跑（背离点击方向）。 */
    var tc = e.target;
    while (tc && tc !== stage && !tc.classList.contains('pj-scene')) tc = tc.parentNode;
    tapHit = !!(tc && tc !== stage && tc._slotJ !== undefined && tc._slotU <= CLICK_MAX_U);
    tapSlotJ = tapHit ? tc._slotJ : -1;
    tapU = (tc && tc !== stage && tc._slotU !== undefined) ? tc._slotU : -1;
    velSamples = [];
    dragVel = 0; dragPrevX = NaN; dragPrevT = 0;   /* 第二百六十九批：重开速度采样 */
    dragging = true;
    dragEngaged = false;
    dragStartX = e.clientX;
    dragBaseX = x;
    if (stage.setPointerCapture) stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', function (e) {
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
      dragOriginSlot = originSlot(x);   /* 第三百二十一批：夹紧与落位的共同基准 */
      dragTarget = x;
      dragPrevT = 0; dragPrevX = NaN;
      setDraggingClass(true);
    }
    if (dragEngaged) {
      /* 第二百五十九批（主人"滑动不是很流畅，很卡很慢"）：棘轮动画打断重起是
         卡顿根源（每跨档启动 130ms 动画、没完成又被下一个打断 → x 追不上指针）。
         恢复拖动完全跟手：pointermove 只更新目标位置，dragTick rAF 每帧 0.95 逼近
         —— 流畅跟手不卡；咔哒/落定交给松手（snapFromDrag 0.6）。
         第二百七十五批：位移不再夹紧（273 批的 ±1 张与 0.15 越界阻尼一并撤）——
         拖多远跟多远，一次手势能滑几张就几张。
         第三百二十一批：夹子装回来（主人"一次只能滑动一张卡片"）—— 跟手 1:1，
         但位置收进「起点那一档 ± 一张」内。
         第三百二十二批：「顶住不动」太死（主人"卡片滑动很不流畅"）—— 改成
         **前 0.7 张 1:1、之后渐近饱和**（railClamp）：手还在动，卡片就还在动，
         只是越来越沉；永不后退、不回弹。 */
      dragTarget = railClamp(dragBaseX + (e.clientX - dragStartX), dragOriginSlot);
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
         旧逻辑 dragVel 冻结在末帧高速，用户停住后松手时落位动画（时为 releaseSpring，
         第二百七十六批为 startFinish）会继承
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
        while (hit && hit !== stage && !hit.classList.contains('pj-scene')) hit = hit.parentNode;
        if (hit && hit !== stage && hit._slotJ !== undefined && hit._slotU <= CLICK_MAX_U) {
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
             点击侧卡居中改用 STEP_K —— 与键盘跳档同款 ~0.5s 优雅滑行 */
          animateTo(-j * stT, STEP_K);
        }
      }
      return;
    }
    snapFromDrag(vel);
  }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  /* 第二百一十八批兜底：stage 的 pointerup 偶发未送达（窗口外松开等）时，
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

  /* 滚轮 / 触控板滚动（第二百七十五批撤掉夹紧 → 第二百七十六批修落位曲线 →
     第三百二十一批把夹子装回来）——
     - 连续跟手：目标 = 手势起点 + 累计位移，animateTo(…, W_K) 每帧逼近，
       与横向拖拽同款手感；滑动全程卡片持续倾斜/缩放，skew 动效全程可见
       （此前棘轮期间 x 冻结在档位、跳档才动 = "经过卡片没动画"）。
       第三百二十一批：累计位移收进「起点 ± 一张」内（与拖拽同一把夹子）——
       触控板甩得再猛，导轨也只走到相邻一张（275 批实测那是 5 张）。
       第三百二十二批：界外由"硬夹"改"饱和"—— 惯性尾巴不再被丢掉，而是把卡片从
       0.7 张慢慢收到 1 张（硬夹版实测：1.2s 的手势里 ~70% 的帧导轨完全不动）。
     - 停滚 120ms 无事件 → `startFinish(起点或相邻一张, 手势末段实速)` 有限时长曲线落位
       （第二百七十六批；取代 ω=18 弹簧 —— 那条指数尾巴实测 133ms 爬行 = "卡顿"）。
       曲线初速取**手势末段实速**（最近 ~140ms 事件位移／时间）：一梭子滚轮推完
       带着速度走 → 曲线从该速度单调减速（不"咔"一下）；触控板惯性尾巴已经
       自然衰减到停了 → 初速≈0 → smoothstep 慢起慢落（不会重启式窜一下）。
     - 方向保持 d = -deltaX - deltaY（左滑/上滑→x 增大=上一个，右滑/下滑→x 减小
       =下一个；第二百三十三批主人指定的传统滚动方向，不改）。
     - e.stopPropagation()：轮播区滚轮不再冒泡到 script.js 的整页平滑滚动器 ——
       此前光标停在轮播上时页面同时在滚，两套滚动叠加 = "和其他方向手感不一样"。 */
  var W_K = 0.92;           /* 跟手逼近系数（同拖拽手感，略紧于 0.9 减滞后） */
  var wheeling = false, wheelBase = 0, wheelAcc = 0, wheelIdleTimer = null;
  var wHist = [];           /* 第二百七十六批：最近 ~140ms 的 {t, 累计位移} ——
                               用来算"手势末段实速"，作落位曲线初速（见上） */
  var W_IDLE = parseInt((location.search.match(/[?&]cwidle=(\d+)/) || [])[1], 10) || 120;

  function wheelEnd() {
    wheelIdleTimer = null;
    if (!wheeling) return;
    wheeling = false;
    /* 第二百七十六批：先量手势末段实速，再清累计量 */
    var vIn = 0;
    if (wHist.length >= 2) {
      var h0 = wHist[0], h1 = wHist[wHist.length - 1], dtH = (h1.t - h0.t) / 1000;
      if (dtH > 0.02) vIn = (h1.a - h0.a) / dtH;
    }
    wHist.length = 0;
    /* 落位目标（第三百二十一批）= 起点 / 相邻一张（pageLanding）。基准量用 wheelAcc
       而不是此刻的 x —— x 是导轨（指数逼近，永远慢一拍），而"这一次手势推了多远"
       才是落位该看的量，何况它已经被夹在 ±1 张内。
       `?cpages=0` 回到 275 批那条"离当前位置最近的一档"。
       第二百七十六批：曲线从 vIn 起、时长按 3D/vIn 定 —— 速度连续。 */
    var st = step();
    var target = PAGE_PER_GESTURE
      ? pageLanding(wheelBase, wheelBase + wheelAcc, 0)
      : Math.round(x / st) * st;
    wheelBase = 0; wheelAcc = 0;
    if (Math.abs(target - x) > 0.5) startFinish(target, vIn, FIN_TMAX_WHEEL);
  }
  root.addEventListener('wheel', function (e) {
    e.preventDefault();
    e.stopPropagation();
    /* 第二百六十四批：拖拽态失联（dragging 卡 true）时滚轮不再被丢弃 ——
       强制复位后接管；这正是此前"连续滑动突然卡住"的主因 */
    resetDrag();
    lastInputT = Date.now();   /* 第二百六十六批：滚轮后紧跟的点击也计入交互簇 */
    lastWheelT = performance.now();   /* 第二百八十六批：起跑判据的"手停了"用这个时刻 */
    /* 第二百七十一批：deltaMode 归一化 —— Safari 物理滚轮常报 line 模式
       （deltaY≈1-3 行），原样累加几乎不动；page 模式 ×step。触控板恒为
       pixel 模式（deltaMode=0）不受影响。 */
    var d = -e.deltaX - e.deltaY;
    if (e.deltaMode === 1) d *= 20;          /* line → px */
    else if (e.deltaMode === 2) d *= step(); /* page → px */
    if (!wheeling) {
      wheeling = true;
      /* 第三百二十一批：手势起点取**档位**（上一段还在落位就取那一段的目标槽）。
         `?cpages=0` 退回"取此刻的 x"（那时夹紧是恒等函数，行为与 275 批逐字相同）。 */
      wheelBase = PAGE_PER_GESTURE ? slotAnchor() : x;
      wheelAcc = 0; wHist.length = 0;
    }
    wheelAcc += d;
    /* 第二百七十六批：手势末段实速采样（≤140ms 窗口，见 wheelEnd） */
    var tNow = performance.now();
    wHist.push({ t: tNow, a: wheelAcc });
    while (wHist.length > 2 && tNow - wHist[0].t > 140) wHist.shift();
    /* 连续跟手：不量化档位、不抖 —— 但累计位移收进「起点 ± 一张」内（第三百二十一批，
     第三百二十二批改饱和）：手势推得再猛，导轨也只走到相邻一张，停滚落 起点 / 相邻一张，
     且界外仍有响应（惯性尾巴 = 自然的滑行收起，见 railClamp）。 */
    animateTo(railClamp(wheelBase + wheelAcc, wheelBase), W_K);
    if (wheelIdleTimer) clearTimeout(wheelIdleTimer);
    wheelIdleTimer = setTimeout(wheelEnd, W_IDLE);
  }, { passive: false });

  /* 第二百八十一批 2026-09-14：自动轮播已移除（原第二百一十九 / 二百二十 /
     二百二十一 / 二百六十三批 —— 每 6 秒自动进下一张，悬停不暂停，交互后重新计时）。
     撤掉的是 AUTO_MS、autoTimer、autoStart/autoStop/autoStep 这五个符号与它们
     散布在 keydown / pointerdown / wheel / wheelEnd / endDrag / 初始化 /
     visibilitychange 的七个调用点。**卡片从此只在主人操作时移动**：
     拖拽 · 滚轮/触控板 · 键盘 ←→ · 点侧卡居中。
     唯一保留的痕迹是下面的 window.__carAuto 空壳（见验收钩子）。 */
  if (document.addEventListener) {
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { resetDrag(); }
      else {
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

  /* 验收钩子（第二百七十三批，第二百七十六批补曲线声明值）：只有 ?cdebug=1 才挂
     —— 读引擎状态（x / 落位目标 / 中心槽），不读 DOM transform（inline 写入时
     恒由引擎决定）。finT / finU0 = 落位曲线**声明的**时长与初速系数：断言要打在这
     两个声明值上，别去打采样帧（采样帧受帧粒度影响，实现正确也会红 —— 见
     skill image-gallery-swipe-engine 的 v11 教训）。 */
  if (CAR_DEBUG) {
    window.__car = function () {
      var st = step();
      return {
        x: x, xTarget: xTarget, step: st,
        slot: Math.round(-x / st),                 /* 中心槽位（无界整数，可跨 0 负向） */
        idx: wrapIdx(Math.round(-x / st)),
        restSlot: FIN ? Math.round(-FIN.to / st) : null,
        finT: FIN ? FIN.T : null,                  /* 落位曲线声明时长 ms */
        finU0: FIN ? FIN.u0 : null,                /* 落位曲线初速系数（0=静止起步） */
        finV0: FIN ? FIN.v0 : lastFinV0,           /* 落位用的实测初速 px/s（调试） */
        finOn: !!FIN,
        animating: !!(raf || dragRaf || FIN),
        dragging: dragging, wheeling: wheeling,
        paged: PAGE_PER_GESTURE,                   /* 第三百二十一批：一次手势一张 */
      };
    };
    /* 第二百八十一批：自动轮播移除后保留的**空壳**，只为验收套件不红 ——
       pj-check / pj-parts / pj-rhythm / pj-wire-probe 采样前都调
       __carAuto(false) 冻结轮播（还有 dbg390.js 不带守卫直接调）。
       删掉它，这些套件会从"冻结后取证"变成"对着正在走的动画取证"（假红）。
       现在卡片本来就不自己动，传任何值都是空操作。 */
    window.__carAuto = function () {};
  }
})();
