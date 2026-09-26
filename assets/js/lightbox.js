/* ===========================================================================
   灯箱引擎（全站唯一一套）—— 2026-09-21 从 pages/posts.html 原样抽出

   谁在用：
     · pages/posts.html（动态页）—— 点 .dy-img 开灯箱，本页只负责"点哪张开哪组"
     · pages/album.html（相册单册页）—— 点 .album-shot 开。2026-09-21（晚）起
                                         **不再传说明/日期**，并额外传 `thumb`（预览带用 480 缩图）
   对外接口（window.RMLightbox）：
     open(list, idx)   list = [{ src, alt, thumb?, emoji?, cap?, meta? }]；后四个都是**可选**的
                       说明行内容，整组都没传 ⇒ 那一行不出现，版面与动态页 v13 逐像素相同
     close()           等价于点空白 / ESC
     isOpen()
     mount(list, idx)  只换内容不开（一般用不到，留给探针）

   ⚠️ 这份注释是引擎十几轮迭代的全部来龙去脉（v9.43 / v11.x / v12.x / v13），
      从 posts.html 原样搬来的，一条没删。要改哪一处先读它，别重走已经走过的错路。
   ⚠️ 页面侧**不要**再碰 .dy-lb-* 的任何内部状态（圆点、槽位、transition）——
      那些是引擎的不变式，从外面写会绕开 lbSeq / lbSettle 的时序保护。
   =========================================================================== */
(function () {
  'use strict';

  /* ======================================================================
     ---------- 灯箱 v11（单图容器 · 切换动效照搬 yibi2333.fun/photowall）----
     ⚠️ 下面这套 32px 出-进淡滑的**来龙去脉**（v11 照搬 → v11.7 下线 → v12 又启用）：
        v11 起就是它；v11.7（09-14）主人嫌"拖动与点击两套动画不一致"，统一成了
        "整条胶片平移一步"；v12（09-15）主人指着参考站说"滑动切换图片的那个动画
        参考这个网页" ⇒ 又换回这一套（加了拖动轻微跟手）。**当前线上跑的就是它。**
     参考站实测（逐帧采样 + getAnimations()，2026-09-13 / 09-15 两次）：
       出：opacity 1→0，translateX 0 → ∓32px，150ms，ease-in  cubic-bezier(.4,0,1,1)
       进：opacity 0→1，translateX ±32px → 0，150ms，ease-out cubic-bezier(0,0,.2,1)
     两段【顺序】执行（Vue <Transition mode="out-in">）：同一时刻舞台上只有一张图。
     方向按导航方向镜像：下一张 → 旧图向左出、新图从右进；上一张 → 反过来。

     ⚠️ 参考站的 class 写着 duration-250 / duration-400，但那两个值不在 Tailwind 的
        默认刻度里（任意值要写 duration-[400ms]），实测 computed transition-duration
        恒为 0.15s —— 两段其实都是 150ms。这里用实测值。

     为什么又回到自绘（v11 删掉 Swiper 11 与 assets/vendor/swiper/）
       v10 的 freeMode 是「连续跟手」：拖动时导轨直接位移，邻图必然同时可见。
       参考站的切换是「单图容器 + 出-进淡滑」，舞台上永远只有一张图。同一个手势
       旋钮不可能同时是这两种东西 —— 主人看过参考站后选了后者（"完全照搬"）。
       代价：触控板/触摸的侧滑翻页与捏合缩放一并去掉，导航回到按钮 / ←→ 键 / 圆点。

     v11.4（2026-09-13，主人"增加滑动图片的功能，一次滑动，只能滑动一张图片"）：
       滑动回来了，但和 v10 的 freeMode 不是一回事 —— **一次手势只走一张**。
       网上与 GitHub 的实现语义完全一致（Embla `skipSnaps:false`、Swiper
       `freeMode:false, shortSwipes:false, longSwipes:false`、ItemSlide `oneItem`、
       Simple Swipe Card `swipe_behavior:single`）：目标索引在手势【开始】时锁成 ±1，
       松手只决定方向、不决定距离。本站把这条规则收在 lbSlideTo 一处。
       结构上：舞台里是三个角色槽位（prev/cur/next），手势期间整条平移，静止时邻居
       opacity:0 ⇒ 「舞台上只有一张图」仍未破坏。拖动/触控板走轨道，按钮/←→/圆点
       继续走出-进淡滑（两套共用一个阶段机，见 lbPhase）。
       触控板那条路最难：惯性尾巴会连来几十个事件，所以手势一旦定向就 lock 死，
       后面的事件只刷新时间戳、一律丢弃（v10.2 / v273 都栽在这条上）。
     v11.5（2026-09-14，主人"怎么还有滑动反弹动画，我不喜欢反弹动画"）：
       **把两处"动一下再回来"都去掉** ——
       ① 端到端不再有 0.28 阻尼橡皮筋（拖到头就是硬停，图完全不动），
          邻图方向也不再给 36px 余量（超拖会让落位往回走，那也是一次可见回弹）；
       ② 松手没过阈值不再是 130~280ms 滑回原位，而是**瞬间归位、无过渡**。
       代价（已与主人确认）：短拖松手会看到一次 ≤110px 的小跳跃。
     v11.6（2026-09-14，主人两条上报：「点击+3显示图片错误，显示的不是对应图片」
     /「在首图和尾图继续滑动会进行循环滑动，首图滑向尾图，尾图滑向首图」）：
       ① 「+N 更多」格不再 `idx += 1` —— 点哪一格就打开那一格里显示的那张
          （2026-09-21 抽共享引擎后，这句判据搬去了各页面自己的开启器：
           动态页见 pages/posts.html 的 DOMContentLoaded 那段）；
       ② **边界只认索引**。原来是否还能翻页看的是手势开始时抓的快照
          （dim.hasP/hasN，源自"槽位里有没有节点"），快照与索引不一致时
          （拖动中换了图、触控板惯性尾巴跨了两次提交）就可能算出一个越界的 target：
          舞台先滑到底、再落进一个空槽位，看上去正是"首图滑到了尾图"。
          现在三层同收：lbSlideTo 按索引硬夹紧 ⇒ 越界一律一动不动；
          lbDims 的 hasP/hasN 也改成按索引推；lbShow/lbMount 再夹一次索引（永不越界）。
          另：端到端被挡下时清掉滚轮累计值（否则反方向要先把位移还完才动），
          并在灯箱打开期间给 <html> 关掉 overscroll-behavior-x（横滑到底不该被
          浏览器的"前进/后退"手势接走）。
     v11.7（2026-09-14，主人「动态页，预览图片拖动滑动动画和点击滑动的动画不一致」
     → 定「统一到点击滑动的那一套：整条胶片平移一步」）：
       · **只剩一套切换动画**：轨道滑动（lbSlideTo）。箭头 / ←→ / 圆点 / 拖动 /
         触控板全都走它，同一段时长模型、同一条曲线。lbGoTo（32px 出-进淡滑）与
         LB_SHIFT / LB_OUT_MS / LB_IN_MS / LB_OUT_EASE / LB_IN_EASE 全部删除，
         lbPhase 也回到只有 idle | settle 两个状态。
         于是"这个动画"只有一处实现、一处时长、一处曲线 —— 以后调手感只调那一处。
       · 有意偏离参考站：它的 mode="out-in" 在结构上要求"舞台同一时刻只有一张图"，
         而"手指跟着走"必然露出邻图，两者数学上互斥。主人的优先级是先要跟手
         （v11.4），再要两条路一致（v11.7）⇒ 统一到轨道这一套，32px 淡滑下线。
       · 顺带的动画优化（见 LB_* 常量与 lbSlideTo 里的注释）：
         ① 位移曲线改 cubic-bezier(.32,.72,0,1)：起手接住手势的动量、尾巴长，
            落位没有过冲（"不反弹"仍在）；
         ② 位移与 opacity 解耦 —— 到位的那张 120ms 内就实心（不要半透明地滑进来），
            滑出去的那张全程实心、只在最后 30% 收干净（不要还占着屏内一大块就淡掉），
            另一侧的邻居立刻归 0；
         ③ 拖动中只有"正在被拉进画面"的那个邻居渐显，另一侧不再跟着亮
            （原来两侧同时淡入，屏边会出现一条对不上的残影）。
       · 点击圆点跨多张：目标先摆进屏外邻居槽（静止时邻居透明，看不见换内容），
         量好尺寸再滑一步 ⇒ "跳 5 张"和"翻 1 张"是同一段动画（不是一个快切）。
     v11.8（2026-09-14，主人「我想要的就是首图继续往前滑可以继续滑动，从尾部开始滑动；
     尾图继续往后可以继续滑动，从开首开始滑动。你怎么没做实现这功能」）：
       · **端到端从"硬夹紧"改成"环形"**。v11.6 我把"首图滑向尾图"当成 bug 掐掉了
         （主人当时的话是两次上报），其实那正是他要的功能 —— 他要的不是"到端点停住"，
         是**转过去**。所以：首图继续往前 = 末张从左边滑进来；末张继续往后 = 首张从
         右边滑进来。六条通路（拖动 / 甩 / 触控板 / 键盘 / 箭头按钮 / 触摸）一视同仁。
       · 折回只有一个实现点：lbWrapIdx(i) = ((i % n) + n) % n。
         ⚠️ 别在第二个地方再写一遍取模 —— v9.11~v9.26 就是散着写 (i + dir + n) % n，
           出现了"只有走到边界才暴露"的错位（那才是真 bug，v9.43 全删）。
           环形的正确性依赖"索引是唯一真相 + 邻居槽里永远摆着环形邻居"这两件事同时成立。
       · lbDims 的 hasP/hasN = (n > 1)：n ≥ 2 时两端永远有邻居 ⇒ 拖动不再有"拉到 0 就不动"
         的硬边界（边界感消失正是环形要的效果）；lbFill 把环形邻居（末张 / 首张）真的摆进
         邻居槽，所以绕过来那张是按它自己的宽高比与宽度滑进来的，步距不用特判。
       · 箭头不再在两端变灰（"首图时上一张灰掉"本身就没意义了）——
         顺带解决了"点灰箭头会穿到遮罩把灯箱关掉"这个别扭（v9.42 起的老行为）。
       · 只有 n < 2（真的只有一张）时两侧才都没有邻居，所有通路自然停住。
     v11.9（2026-09-15，主人「第 1 张往左滑动，第 12 张应该从左边滑进来，这和第 2 张往
     第 1 张图片的滑动一样。第 12 张往右滑动，第 1 张应该从右边滑进来」）：
       · 补上 v11.8 漏掉的一半 —— 点击类通路（←→ 键 / 左右箭头 / 圆点）在两端
         **不同形**：lbGoSlide 用 `Math.abs(target - lbIndex) === 1` 判"相邻"，而首图的
         上一张数值上是第 n 张（差 n−1）⇒ 掉进"跨多张跳转"分支，方向按数值取反、
         目标被塞进反侧槽位，朝着中心来的槽位是空的：当前张往反方向滑走、下一张
         直接冒出来。改成按【环形】判相邻（target === wrap(i±1)）。
       · 拖动 / 甩 / 触控板原本就对（dir 由手势给，直接进 lbSlideTo）；圆点从首图点
         末张现在也是"从左边滑一步进来"，与拖动同一个观感。
       ⚠️ 教训：环形里**任何**"数值相邻"的判断都是错的 —— 判相邻、判方向、判边界
         一律走 lbWrapIdx。
     v12（2026-09-15，主人「图片滑动的动画参考这个网页（yibi2333.fun/photowall），
     你只用优化我网页的滑动时切换图片的那个动画」）：
       · **切换动画换回参考站那套 32px 出-进淡滑**（v11.7 的轨道滑动下线）。先做了
         三版并排 demo（现状 / 参考站+轻微跟手 / 参考站+不跟手）让主人挑，选的是
         **参考站 + 轻微跟手**：
           拖动 → 画面位移 = 手指位移 × damp(0.29)，封顶 32px（邻图全程不参与，
                  所以"舞台上任何时刻只有一张图"这条不变式反而更硬了）；
           松手过线 / 点箭头 / ←→ / 圆点 / 触控板 → 出 150ms ease-in（→ ∓32px + 淡到 0）
                  → 空档 40ms → 进 150ms ease-out（±32px / 透明 → 0 / 实心）。
       · 好处是**环形彻底免费**：所有通路的落位都只有"32px 两段"，谁也不用算步距、
         不用判相邻、不用摆槽位 ⇒ v11.6/v11.8/v11.9 那一串绕回边界的病根（判数值相邻、
         空槽位、半格偏移）在结构上消失了。
       · 代价（已知并接受）：拖动时不再看见邻图跟进来（参考站本来就没有拖动）。
       · 提交阈值仍沿用原来的像素判据（见 lbCommitDist），只是**判据读的是原始手指
         位移**，不是画面位移 —— 画面被封顶在 32px，拿它当判据的话永远过不了线。
       · 实测口径：`v11check.js` 第 5/12/13/15/16 组已按新契约重写。
       ⚠️ 上面 v11.4~v11.9 的历史注释里出现的 `lbSlideTo` 就是现在的 `lbSwitchTo`
          （v12 改名 —— 它不再"滑一整步"，叫 slide 会误导下一个读代码的人）。
     v12.1（2026-09-15 21:31，主人「连续滑动图片不是很流畅」）——**连发输入不吞不弹**：
       · 病根两条，都是"连发"才暴露的：
           ① `lbSettle()` 只在进相成立 —— 出相里落定 = 把已提交的那一步**取消**掉
              （那时 lbIndex 还没改）⇒ 画面往回弹。实测：连续拖动 5 次只走掉 **1 张**，
              而且屏幕上能看到 -32px 弹回 0 的那一下。
           ② 触控板那条有 `if (lbPhase !== 'idle') return;` —— 淡滑中来的**新手势**
              被整条丢掉（它的头几个事件进不来，acc 恒为 0，只剩尾巴凑数）。实测：
              连发 6 条只走 5 张，还出现过 ~1.8s 的死区（"我滑了它不动"）。
       · 修法是**一处根因**：lbIndex 在**开段那一刻**就提交（不再等换图那一帧）。
         于是"落定"在任何相位都落在这一段的终点上，永远不会往回弹；内容仍然只在
         出相结束的空档里换（lbFill）⇒ 观感还是"先淡干净、再淡进来"，契约没动。
       · 触控板去掉相位闸：lbSwitchTo 本来就可被打断（新一段从**当前渲染位置**接着走，
         CSS 过渡自动连续），"一条手势一张"依旧由 lock 保证。
       · 拖动：`pointerdown` 不再落定（原来"点一下"就会把动画砍掉，包括点到图外想关灯箱），
         改到**轴向判明、真开始横拖**时才落定。
       · ⚠️ 教训：**"落定到终点"必须真的是终点**。旧注释写着"推到终点"，代码在出相里
         干的是"取消"——注释与实现不一致比没注释更坏。
     v12.2（2026-09-15 22:31，主人「有时一个手势可以滑动两张图」+「手指不离开、慢慢拖」）
       ——**把 v12.1 的幅度判据整个删掉**，边界只认"事件流里真正的停顿"：
       · v12.1 为了不让"尾巴里再滑一下"被吞，加了 peak / inTail / push 三件套
         （幅度掉到峰值一半以下 + 抬头 ≥1.25 倍 + ≥6px）。它把**手自己在一次接触里的
         变速**（加速→减速→再加速）当成了"新手势"⇒ 同一次拖动翻两张。
       · 复现（`scratch/lb-v12/probe-onestroke.js`，一段连续接触、全程无空档）：
         v12 = **1 张**、v12.1 = **2 张** ⇒ 这个 bug 是 v12.1 引入的，不是老毛病。
       · 现在**唯一**的解锁口是 `fresh`（静默 > LB_WHEEL_GAP，140ms → 70ms）。
         理由：新的手指动作必然要求手指先停/离开 ⇒ 事件流里必然有空档；
         而**连续接触期间没有空档**（~17ms 一拍）、**惯性尾巴也没有空档**。
         于是连续拖动和快甩都只走一张，抬手再滑才走第二张 —— 结构上保住了，
         不依赖任何幅度阈值。70ms 取在"心跳 ~17ms"与"人手抬手再放回 ~100~300ms"之间。
       · ⚠️ 教训：**"一个手势一张"只能靠结构性判据保住**。凡是靠"幅度够不够大"的写法，
         都会被"手自己会变速"和"尾巴会抖"打穿 —— v12.1 已经用一次线上 bug 证明过。
       · 动画本身也改了一处（主人同一条消息里的「优化一下动画」）：换图之后挂进相过渡
         原来要**等两个 rAF**，那是与帧率绑死的 —— 本机常态 27fps 时两个 rAF ≈54ms，
         叠在 gapMs 40ms 上，out-in 空档实测从设计值 40ms 涨到 **135ms**（每切一张都白等）。
         改成读一次 `offsetWidth` 强制重算，空档回到 ~40ms，且**与帧率无关**。
         ⚠️ 这个改动必须靠套件里"进相挂的是 150ms ease-out / 进相单调回 0 / 起点在屏外那侧"
           三条守住 —— 一旦过渡没挂上，新图会直接出现、没有进相（老注释记的正是这个坑）。
     v12.3（2026-09-16 00:21，主人「现在滑动怎么不能连续滑动了」）
       ——**v12.2 那条"只认停顿"的边界是错的**：惯性尾巴本身就把"停顿"永远占着，
       尾巴没走完再滑一下会被整条吞掉 ⇒ 不能连续滑。这次不再凭想象写判据，改成
       **移植 wheel-gestures 的惯性探测**（MIT © xiel），并拿它仓库里**真机录制的**
       12 段 macOS 触控板 / 妙控板事件流当验收数据（`scratch/lb-v12/tp-fixtures/`）：
       · 判据①`isMomentum` 看的是**加速比**（每 2 条事件合成一个速度取样点，最近 5 个
         取样点的逐轴速度比都落在 [0.6,0.96]）—— 尾巴是"每拍稳定掉一点"，手的变速
         做不到连续 5 拍稳定。实测：真实慢拖 194 条、画方块 207 条，**一次都没误判**。
       · 判据②"平滑衰减之后的一次突降"（连续 4 拍平滑衰减，然后单拍掉到一半以下）=
         手指落下、系统停掉惯性时报的那一下（真实录制里是 `11 → 2`）。
       · 判据③库自带的 cancel（`|Δ| > 上一拍 ×2` 且已在惯性里）= 手指**砸**下来。
       · **惯性期间的事件一条都不算**（不再只靠 lock 挡），所以尾巴再长也不会多走一张。
       · 覆盖：只用语料库自己的边界，把第二笔接到尾巴各处只认得出 1/21 个位置；
         加上②是 21/21。连甩 1/2/3/4/5/6 下 → 1/2/3/4/5/6 张。
       · ⚠️ 同时把 `LB_WHEEL_MIN` 12 → 24：真实录制里"手搁在触控板上"的 1px 漂移
         10 拍就能凑到 12，于是**搁手 + 随后一甩 = 2 张**（`swipe-right-fast` 就是这么
         翻两张的）。24 之后 11 段真实"一次接触"全部恰好 1 张。
       · ⚠️ 别再用"幅度抬头"当判据（v12.1 栽过，v12.3 又拿真实数据验了一遍：
         任何"抬头型"规则都会在真实连续拖上误报）。关键在于**掉得比别人突然**，
         不是掉得深。
       · ⚠️ 顺带修掉套件里一个**已经过时的合成模型**：⑪.a 原来写的是"尾巴平滑衰减到
         -0.8 再抬头 + 静默 120ms"来模拟连发 —— 那个形状在真机里不存在（尾巴在手指
         搭上那一刻是**被截断**的：实录 `11 → 2`，中间只隔 39ms），所以它测的其实是
         一个假动作集。改成照抄实录的三段（衰减 7 拍 → 静默 39ms → 报信 `-2` + 重新
         发力），连发 1..6 就稳定是 1..6 了。**合成模型也要有物理依据**。
       · ⚠️ 还揪出一处**页面与离线复现不一致**：复现里写的是"惯性里的事件丢位移、
         但仍然看解锁口"（`if (st.momentum && !extra) continue`），页面第一版却写成
         无条件 `if (st.momentum) return`。拿 66 个样本数过（`tp-invariant.js`）：
         **61 次解锁里有 38 次发生在 momentum 已为真那一拍**（cliff 与 momentum
         可以同时为真；start/cancel 不会，因为 cancel 自己先 end()）⇒ 那条无条件
         return 会吃掉 38 次重滑。两行顺序已按复现对齐。**"套件全绿"只有在页面与
         复现逐字一致时才证明得了这份实现。**
     ⚠️ v11.7 那条"只剩一套切换动画（轨道滑动）"已被 v12 取代 —— 见上。

     保留的三个坑位（跨版本反复踩到，别再丢）：
       ① 「换图片」必须用**已解码**的同一个 <img> 元素，而且在槽位间【移动】而不是
          重建 —— 舞台是 flex shrink-wrap，子图没解码时尺寸 0，整盒塌缩（v9.43 的
          老问题）。做法：lbWarm 缓存 new Image() 并 decode()，lbSlotPut 搬元素。
       ② 剩余外壳（左右箭头 / 底部圆点）一律绝对定位，不能进 flex 流（会把图挤偏）。
       ③ 阅读框用 min(calc(100vw - pad*2), …) 算。不要给嵌套层写 max-height:100%
          —— 父层高度是 auto 时，百分比会被当成 none 丢掉。
     v13.2（2026-09-22，主人「触控板上下滑动也能滑动照片」）——**竖滑接管**：
       · 原来那条 `if (!dx || Math.abs(e.deltaY) > Math.abs(dx)) return;`（v12.x 写下）
         把竖滑整条挡在门外：不 preventDefault、不喂探测器 ⇒ 上下滑一点反应都没有
         （探针 `vwheel-check.js` 实测 0 张，而横滑 +1 张）。
       · 改成**主轴判定**：`|dx| >= |dy|` 走横滑（这条路径与改前**逐字相同** ——
         同一个 `feed(dx, dy)`、同一个 `acc += dx`），否则 `vert` 为真，把 deltaY 当主轴。
       · ⚠️ 两条轴**共用同一个探测器实例**（`lbTp`），不是各起一个：
         一次接触里轴心难免漂移，两个探测器会各自判 start/cancel/cliff 各自解锁
         ⇒ "一次滑动一张"直接破掉。feed 的加速比判据本来就是逐轴对称的，竖向照样能
         识别惯性尾巴（探针里"手指段 + 尾巴 + cliff"那条恰好 1 张）。
       · 方向：两指**上**滑（macOS 自然滚动 ⇒ deltaY > 0）＝ 下一张，与横滑的
         deltaX > 0 ＝ 下一张同源（都是"内容往那边走"，见 `var dir = acc > 0 ? 1 : -1`）。
       · 顺带补一条 `e.ctrlKey` 守卫：macOS 触控板的**捏合**在浏览器里就是 ctrl+wheel，
         不拦的话捏合缩放会变成翻页（探针 PINCH 那一例守着）。
       · 灯箱没开时一切照旧（监听器第一行就 return，页面滚动不受影响）。
     ＊ 参数覆盖：?lbspeed=1.3（滑动时长倍率 0.4~3）、?lbdebug=1（暴露 window.__lb()）
     ====================================================================== */
  var lb = document.getElementById('dyLb');
  /* 本页没有灯箱 DOM（引错页）就直接不启动 —— 不留一堆 null 引用到运行时 */
  if (!lb) return;
  var lbStage = document.getElementById('dyLbStage');
  var lbPrev = document.getElementById('dyLbPrev');
  var lbNext = document.getElementById('dyLbNext');
  var lbDots = document.getElementById('dyLbDots');
  var lbRotate = document.getElementById('dyLbRotate');   /* v13.1：屏幕上已不可见（sr-only）；
                                                            只当「横屏观看」的 aria 出口，
                                                            触发改成点照片 —— 见页尾 v13 注释块 */
  /* 三个【角色槽位】—— cur 恒为当前张，prev / next 恒为其左右邻居。
     槽位固定不变，内容靠"移动节点"换（理由见 lbSlotPut）。 */
  var lbSlotPrev = document.getElementById('dyLbSlotPrev');
  var lbSlotCur = document.getElementById('dyLbSlotCur');
  var lbSlotNext = document.getElementById('dyLbSlotNext');
  var lbSlots = [lbSlotPrev, lbSlotCur, lbSlotNext];

  var lbPhotos = [];
  var lbIndex = 0;
  var lbNode = null;        /* 当前张的节点：<img> 或 .dy-lb-emoji */
  var lbPhase = 'idle';     /* idle | out | in（v12 起两段式回来了，见 lbSwitchTo） */
  var lbTo = 0;             /* 本段的目标索引 */
  var lbTimer = null;
  /* v12：段号。每开一段 / 每次落定都 +1；出→进之间的那两个 rAF 回调靠它判断
     "我还属于当前这一段吗"。少了它，落定后紧接着开的下一段会被上一段的回调盖掉
     （症状：拖一下再点箭头，新一段刚起步就被写回 0 / 实心）。 */
  var lbSeq = 0;
  var lbWarm = {};          /* src -> 已 decode 的 HTMLImageElement（复用，不重建） */
  var lbLastFocus = null;   /* 开灯箱那一刻的焦点，关闭时还回去（见 lbRestoreFocus） */

  /* ⚠️ v11.7 曾把上面那套（LB_OUT_MS / LB_IN_MS / LB_OUT_EASE / LB_IN_EASE）删掉，
     理由是"点击与滑动要一致"。v12（09-15）主人指定换回参考站那套之后它们又回来了 ——
     而且这次是**唯一**一套：拖动 / 触控板 / 箭头 / ←→ / 圆点全走 lbSwitchTo，
     所以"两套不一致"这个病在结构上不可能再出现。 */
  var LB_SPEED = (function () {
    var m = /[?&]lbspeed=([0-9.]+)/.exec(location.search);
    var v = m ? parseFloat(m[1]) : 1;
    return (v >= 0.4 && v <= 3) ? v : 1;
  })();
  var LB_DEBUG = /[?&]lbdebug=1/.test(location.search);
  /* v11.2：不再有"统一画框 / 等比"两种模式 —— 尺寸规则只有一条，写在 CSS 里
     （.dy-lb-slot 里 img 的 max-width/max-height）。`?lbfit=` 已删除。 */

  /* ---- 滑动参数（v11.4）----
     网上与 GitHub 上"一次滑动只走一张"的全部实现，语义都是同一句话：
     **目标索引在手势【开始】时就锁成 ±1，松手只决定方向，不决定距离。**
       · Embla Carousel  `skipSnaps: false`（默认）—— "Allow the carousel to skip
         snap points if it's dragged vigorously"，关掉即一次手势一步。
       · Swiper          `freeMode: false, shortSwipes: false, longSwipes: false`
         —— 非 freeMode 下滑动只走一张（v10 恰恰开的是 freeMode，所以会连翻）。
       · ItemSlide       `oneItem: true`；Simple Swipe Card `swipe_behavior: single`
         （"Each swipe moves exactly one card"）。
     本站没有引库，但把同一条规则落在 lbSwitchTo 里（target = lbIndex ± 1，恒定）。
     触控板那条路径还要额外对抗惯性尾巴（v10.2 / v273 都栽在这），见下面的 wheel。 */
  var LB_GAP = 26;             /* 胶片里两张照片之间的缝（px） */
  var LB_DRAG_MIN = 8;         /* 超过这个位移才判定轴向：区分"点一下"与"拖" */
  var LB_COMMIT_FRAC = 0.22;   /* 走完 22% 步距即提交（Swiper 用 50%，Embla 靠速度） */
  var LB_COMMIT_MAX = 110;     /* 但阈值不超过这个像素数（宽图步距近千） */
  var LB_COMMIT_MIN = 46;
  var LB_FLICK = 0.45;         /* px/ms：轻甩也能翻 */
  var LB_FLICK_MIN = 12;       /* 但要真的动过，否则是抖动 */
  /* ---- 切换动画（v12，2026-09-15 主人选定参考站那套）----
     「图片滑动的动画参考这个网页（yibi2333.fun/photowall），你只用优化我网页的滑动时
       切换图片的那个动画」⇒ 三选一 demo 里挑了 **B：参考站 + 拖动轻微跟手**。
     结构：舞台任何时刻只有一张图（邻图全程不参与），一步 =
       出 150ms ease-in（位移到 ∓32px + 淡到 0）→ 空档 ~40ms → 进 150ms ease-out
       （从 ±32px / 透明处回到 0 / 实心）。两段顺序执行，不重叠。
     ⚠️ 这推翻了 v11.7 的决定（当时统一到"整条胶片平移一步"）—— 两次都是主人的选择，
        别再拿 v11.7 的注释去"修回"轨道滑动；要改先问。 */
  var LB_NUDGE = 32;           /* 出/进相位移（参考站实测值，逐帧核过） */
  /* 🔴 2026-09-22 主人「优化连续滑动的手感」：整条时间线压到 **0.75×**
     （150/40/150 → 112/30/112，一步 340ms → 254ms）。
     形状一个字没改 —— 还是"先淡干净、再淡进来"，只是每张少花 86ms。
     实测（连甩 6 下，`trace.js`）：照片处于半透明/全透明的帧占比
       20.6% → 14.3%（连甩时）；12.0% → 8.1%（慢速时）；
       "落定帧"（opacity 1 且 tx 0）占比 21.9% → 29.8% / 48.7% → 61.8%。
     ⇒ 连续滑动时"照片一闪一闪"的感觉明显少了。
     ⚠️ **三段一起压**，别只压一段：比例（5 : 1.33 : 5）变了就不是参考站那条曲线了。
     ⚠️ 想再快/再慢走 `?lbspeed=`（0.4~3 倍率，已存在），别就地改这三个数。 */
  var LB_MS_K = 0.75;
  var LB_OUT_MS = 150 * LB_MS_K;   /* 出相时长 */
  var LB_IN_MS = 150 * LB_MS_K;    /* 进相时长 */
  var LB_SWAP_GAP = 40 * LB_MS_K;  /* 出完到进之间的空档（参考站 Vue mode="out-in" 实测 ~50ms） */
  var LB_OUT_EASE = 'cubic-bezier(.4,0,1,1)';    /* = ease-in（与参考站一致） */
  var LB_IN_EASE = 'cubic-bezier(0,0,.2,1)';     /* = ease-out（与参考站一致） */
  /* 跟手：画面位移 = 手指位移 × damp，封顶 32px（= 出相终点，所以松手再接出相是连续的）。
     damp 取 32/110 ⇒ 手指正好拉到提交线时，画面恰好吃满 32px。 */
  var LB_DRAG_CAP = LB_NUDGE;
  var LB_DRAG_DAMP = LB_NUDGE / LB_COMMIT_MAX;
  /* ⚠️ 这里原来有 LB_NEAR_FADE（邻图随拖动渐显的像素阈值），v12 删除 ——
     跟手封顶只有 32px，邻图从第一帧起就是透明的，没有"渐显"这回事了。
     再往上还有 LB_EDGE_RUBBER / LB_EDGE_SLACK（端到端 0.28 阻尼 + 36px 余量）：
     2026-09-14 按主人要求**删除**（「怎么还有滑动反弹动画，我不喜欢反弹动画」）。
     拖动现在是硬封顶（见 lbDragVis），松手没过阈值也是瞬间归位（见 lbDragEnd）。
     v12 的 32px 跟手封顶不是"回弹"：到顶就不动，松手也不会往回弹。
     别再把它当成"手感更好"加回来。 */
  /* ---- 离散滚轮档（2026-09-22 主人「优化连续滑动的手感」）----
     病根：`lock`（"这一次手指动作已经走掉一张了"）只在手势探测器报 start/cancel/cliff
     时解开，而它还有个 300ms 的兜底门槛（LB_TP_END_FLOOR）。**鼠标滚轮没有惯性尾巴、
     也没有 cliff 报信** —— 连格之间的间隔（几十毫秒）什么信号都不产生，
     于是"连滚 6 格只走 1 张"（实测）。触控板不受影响（那边是连续事件流 + cliff）。
     判据：单条事件的位移很大 **且** 距上一条够远 ⇒ 这是一格新的动作。
       鼠标滚轮一格 = 100~120px（Chrome 的像素模式）；
       触控板单条事件即使快扫也就 40~60px，而且事件间隔 ~16ms
       ⇒ 两个条件一起要求才分得开。
     ⚠️ 它**不进手势探测器**（不喂 lbTp、不碰它的状态），只在锁上开一个口子 ——
        惯性判据一个字没动。
     ⚠️ momentum 为真时绝不解锁（那是尾巴，不是新动作）。
     ⚠️ 合成时间线验过：一次快速横扫 1 张、横扫+尾巴 1 张、
        "拖到一半停 90ms 再以 30px 抬头续拖" 仍然 1 张（没有 split 成两张）。 */
  var LB_NOTCH_MIN = 60;       /* 单条事件的最小位移，才算"一格" */
  var LB_NOTCH_GAP = 40;       /* 且距上一条至少这么久 */
  var lbLastWheelT = 0;

  var LB_WHEEL_MIN = 24;       /* 轮子手势的最小累计位移。
     ⚠️ v12.3 从 12 抬到 24：真实录制（`tp-fixtures/swipe-right-fast.json`）里，
     "手搁在触控板上"会产生 ~1px/拍 的漂移，10 拍就凑到 12 ⇒ 搁手 + 随后真甩一下
     = 翻两张。24 之后 11 段真实"一次接触"全部恰好 1 张，真甩（累计 700~3000）
     一点都不受影响。 */
  /* ---- 触控板手势边界：惯性尾巴探测（v12.3）----------------------------
     移植 wheel-gestures（MIT © xiel，https://github.com/xiel/wheel-gestures）。
     选它的理由：它是唯一拿**真机录制的** macOS 触控板 / 妙控板事件流做回归的实现，
     那 12 段录制现在就是本项目的验收数据（`scratch/lb-v12/tp-fixtures/`）。

     三段历史（别再把走过的错路走一遍）：
       v12.2 只认"静默 > 70ms" ⇒ 惯性尾巴每 ~17ms 来一条、能连着来 1 秒多，
                            "静默"永远凑不满 ⇒ 尾巴没走完再滑会被整条吞掉
                            （主人 09-16 报的「滑动不能连续」就是这个）。
       v12.1 用"幅度抬头" ⇒ 手在一次接触里本来就会变速（加速→减速→再加速），
                            幅度自己就会掉一半再抬头 ⇒ 同一次拖动翻两张。
       教训：**"同一个动作到底走了几步"只能靠事件流的形状判**（加速比 / 突降 / 停顿），
             靠"幅度够不够大"永远判不出来。

     ① 惯性判据（库原值，一行没改）：每 2 条事件合成一个速度取样点，看最近 5 个
        取样点的逐轴速度比是否都落在 [0.6, 0.96] —— 尾巴是"每拍稳定掉一点"，
        手的变速做不到连续 5 拍都稳定在那个带里。
        ⚠️ 惯性期的事件【一条都不算】（不累加 acc），所以尾巴再长也只走一张。
     ② 突降判据（我们加的，有数据）：尾巴是**平滑**衰减（逐拍比值 0.88~0.93），
        做不出"突然单拍掉一半"。真实录制里手指落下那一下就是 `11 → 2`（比值 0.18）。
        所以：连续 4 拍平滑衰减之后出现一次 ≤0.5 的突降 ⇒ 手指落下了 ⇒ 解锁。
        为什么必须有它：只靠库自己的 cancel，把第二笔接到尾巴各处只认得出 1/21 个
        位置；加上这条是 21/21。而它在 11 段真实"一次接触"上一场都没误报。
     ③ 库的 cancel（`|Δ| > 上一拍 ×2` 且已在惯性里）：手指**砸**下来时走这条。
     三者合起来：连续拖 = 1 张（真实慢拖 194 条、画方块 207 条全程不误判）；
                连甩 1/2/3/4/5/6 下 = 1/2/3/4/5/6 张。
     ⚠️ 千万别退回"抬头型"判据 —— v12.1 和 v12.3 两次都拿真实数据验过它会误报。
     ⚠️ 只有**横向事件**喂给探测器（竖滚不接管）：竖向也喂的话，竖滚的惯性会让
        随后那次横滑被当成尾巴丢掉。
     -------------------------------------------------------------------- */
  var LB_TP_MERGE = 2;         /* 每 2 条事件合成一个速度取样点（库原值） */
  var LB_TP_ANALYZE = 5;       /* 看最近 5 个取样点（库原值） */
  var LB_TP_ACC_MIN = 0.6;     /* 速度比落在这个带里 = 像惯性（库原值） */
  var LB_TP_ACC_MAX = 0.96;
  var LB_TP_SMOOTH = 4;        /* 连续 4 拍平滑衰减 = 已经在尾巴里 */
  var LB_TP_CLIFF = 0.5;       /* 其中单拍掉到一半以下 = 手指落下那一下 */
  var LB_TP_CANCEL_JUMP = 2;   /* 库的 cancel：|Δ| > 上一拍 ×2（且已在惯性里） */
  var LB_TP_CANCEL_MIN = 2;
  /* 手势结束的静默门槛。库在惯性期只给 ~24ms（它只想尽快报 end），太短：尾巴中途卡
     一下就会被当成"手指离开了"，剩下那些 1px 的事件会被算成新手势、再翻一张。
     真实数据（12 段录制的**手势内**最大事件间隔，排除掉已知的两次抬手）：
       32 33 33 34 34 34 34 39 64 —— 最大 64ms（`square-move-trackpad`，系统合并了事件）
     这一档只影响**没有物理报信的重滑**（慢拖抬手、再慢拖）能容忍多长的停顿，以及
     **尾巴中途卡顿**能容忍多久，两边的实测边界（`scratch/lb-v12/tp-sweep.js`）：
       floor=200 → 卡顿 ≤100ms 安全；慢拖·停 ≥200ms 认得出
       floor=300 → 卡顿 ≤200ms 安全；慢拖·停 ≥300ms 认得出  ← 选它
       floor=400 → 卡顿 ≤300ms 安全；慢拖·停 只有 ≥500ms 才认得出（300ms 的会吞）
     300 是两侧的膝盖：64ms 的 4.7× 余量，且不与"慢拖·停 300ms"打架。
     ⚠️ 有物理报信的重滑（真机双甩：静默 39ms + 幅度 `11→2` 那一下）**与这个值无关**，
        200/300/400/800 都认得出（`tp-a.js` 实测）。所以抬高它不会让"连滑"变吞。
     ⚠️ 残余风险：尾巴中途卡顿 **>300ms**（主线程被卡住，罕见）时，尾巴残段会被算成
        一次新手势、多翻一张。这是静默类判据的硬边界，消除不了；要消除只能靠
        物理报信，而报信在卡顿里正好也丢了。 */
  var LB_TP_END_FLOOR = 300;
  /* 「圆点超过多少张就不画、改用『当前 / 总数』」这套**已经整条撤掉**（2026-09-21 晚 · 第二百九十六批）：
   * 底部换成了**小照片预览带**（见下面「底部预览带」）。原来那个 18 的依据是
   * 「最窄支持宽度 320 − 两侧内边距 36 = 284px，除以（7 + 8）≈ 18.9」—— 它解决的只是
   * "圆点排不下"这件事；预览带把这件事从"少画几个"换成了"横向平移"，所以上限、计数行、
   * 以及圆点那套 CSS 一起退休。要看旧版：`~/.workbuddy/scratch/lb-thumbs-2026-09-21/*.before2.*`。 */
  var LB_CLICK_MUTE = 260;     /* 拖完抑制 click 的窗口（否则指针落在图外会误关灯箱） */

  function lbMs(base) { return Math.round(base / LB_SPEED); }

  /* 预热 = 建一个 Image 并 decode()，缓存起来复用。
     ⚠️ 不是"预加载"这种模糊说法：只有解码完成，把元素搬进 DOM 才不会出现尺寸 0
     的那一两帧（舞台塌缩 → 图先跳一下再落位）。 */
  function lbWarmSrc(src) {
    if (!src || lbWarm[src]) return;
    var im = new Image();
    im.decoding = 'async';
    lbWarm[src] = im;
    im.src = src;
    if (im.decode) im.decode().catch(function () {});
  }
  /* 邻近预热：上到第 i 张时把 i±1 先解码好，下一段进相才不用等。
     ⚠️ 环形下"邻居"也是按环形取的：走到末张时预热的是首张 —— 不这么写，
     从末张滑回首张那一步会用一张还没解码的图，宽度按 0 算 ⇒ 落位错一下。 */
  function lbWarmNear(i) {
    var n = lbPhotos.length;
    if (n < 2) return;
    lbWarmSrc(lbPhotos[lbWrapIdx(i - 1)].src);
    lbWarmSrc(lbPhotos[lbWrapIdx(i + 1)].src);
  }

  /* 要放进舞台的那个节点：有 src → 复用预热好的 <img>；无 src → emoji tile */
  function lbPick(ph) {
    if (ph.src) {
      if (!lbWarm[ph.src]) lbWarmSrc(ph.src);
      var im = lbWarm[ph.src];
      im.alt = ph.alt || '';
      im.draggable = false;
      return im;
    }
    var sp = document.createElement('span');
    sp.className = 'dy-lb-emoji';
    sp.textContent = ph.emoji || '\u{1F5BC}';
    return sp;
  }

  /* 位移与 opacity 是**两件独立的事**，时长/曲线/延迟都不一定相同（v11.7）——
     `transition` 是简写属性，分两次写会互相覆盖（后写的把整条列表顶掉），
     所以必须一次写全：transform 一段 + opacity 一段（oDelay 非 0 时带延迟）。 */
  function lbFx(el, tMs, tEase, oMs, oEase, oDelay) {
    el.style.transition = 'transform ' + tMs + 'ms ' + tEase +
                          ', opacity ' + oMs + 'ms ' + oEase +
                          (oDelay ? ' ' + oDelay + 'ms' : '');
  }
  /* 关掉过渡 = 下一次写 transform 立刻生效（拖动跟手 / 归位都用它） */
  function lbFx0(el) { el.style.transition = 'none'; }

  /* 圆点高亮（当前张 = 长条）。抽出来是因为它有两个调用时机：
     ① lbFill 落定后按 lbIndex 同步；② lbSwitchTo 一开段就按【目标】同步 ——
     参考站的圆点是点下即动（实测点击后 ~20ms 起、300ms 走完），而不是等一相播完。 */
  /* ---- 说明行（2026-09-21 共享引擎新增）----
     ⚠️ 2026-09-21（晚，主人「浏览照片不用名字和日期了。浏览照片的UI做的和动态页一样吧」）起
        **两个页面都不再传 cap/meta** ⇒ 这一行现在只服务「张数超过圆点上限」时的
        「当前 / 总数」。渲染代码与样式**原样留着**（cap/meta 对引擎是可选字段，
        谁要再传进来照样显示），别顺手删。
     两件事分开写清楚：
       · lbCapRows  = 这一组照片到底要不要这一行（有说明 / 有日期 / 张数超上限需要计数）
       · lbMeasureCap = 量一次真实行高，把「行高 + 缝」写进 --lb-cap-h
     为什么要量：说明会折行。把行高写死，窄屏两行的说明就会越过 band 压到画面上。 */
  var lbCap = document.getElementById('dyLbCap');
  var lbCapRows = false;    /* 这一组要不要说明行 */

  function lbCapSpan(cls, text) {
    var n = document.createElement('span');
    n.className = 'dy-lb-cap-' + cls;
    n.textContent = text;
    return n;
  }

  function lbMeasureCap() {
    if (!lbCap || !lbCapRows) { lb.style.setProperty('--lb-cap-h', '0px'); return; }
    /* 先把内容写进去再量 —— display:none 时高度恒为 0，量出来等于没量。
       ⚠️ 缝从 CSS 读（--lb-cap-gap），别在 JS 里再写一个数：两处会漂。
       ⚠️ 量 `getBoundingClientRect().height`（小数），**不要**用 offsetHeight ——
          后者四舍五入到整数。实测 14px 正文 × line-height 1.45 = 20.3px，
          取整成 20 就少了 0.3px ⇒ 说明行的上缘会探进画面下缘一点点（immersive 下量到过）。
          再往上 `ceil` 一格：宁可多留 1px 空气，也不许两块压在一起。 */
    var gap = parseFloat(getComputedStyle(lb).getPropertyValue('--lb-cap-gap')) || 12;
    var h = lbCap.getBoundingClientRect().height;
    lb.style.setProperty('--lb-cap-h', (h ? Math.ceil(h + gap) : 0) + 'px');
  }

  /* 说明行随**画面**换（lbFill 那一刻），不跟着圆点提前走 ——
     圆点是"点下即动"的位置指示，说明是在讲**现在这张**，提前 190ms 说下一张的事会驴唇不对马嘴。 */
  function lbSyncCap() {
    if (!lbCap || !lbCapRows) return;
    var p = lbPhotos[lbIndex] || {};
    lbCap.textContent = '';
    if (p.cap) lbCap.appendChild(lbCapSpan('t', p.cap));
    if (p.cap && p.meta) lbCap.appendChild(lbCapSpan('s', '\u00b7'));
    if (p.meta) lbCap.appendChild(lbCapSpan('m', p.meta));
    /* 原来这里在"圆点被上限挡掉"时补一个「当前 / 总数」；2026-09-21 晚圆点换成预览带后
       不存在"挡掉"这回事了（见「底部预览带」），整段撤掉。 */
    lbMeasureCap();
  }

  /* ---- 底部预览带（2026-09-21 晚 · 第二百九十六批）----
     主人：「点点下面可以换成小小的照片预览图吗？参考苹果的设计。预览图片为小小的，
     长方形高度比长度长。但滑动至当前图片时，长方形变为正方形。」
     —— 这就是 Apple「照片」App 里照片下方那条**缩略图带**（官方帮助：「左右轻扫照片继续浏览，
     或者**轻扫照片下方的缩略图**快速向前或向后跳」）；iPad 版 scrubber 的文档也写着
     「a larger 'selected' thumbnail image ... positioned relatively within the scrubber」。

     几何：非当前张 = 竖长条（高 `--lb-thumb-h`、宽 = 高 × 0.75 ⇒ **高度比长度长**）；
           当前张 = **同高的正方形**（变宽）+ 白描边 + 点亮。
     张数超过 `LB_THUMB_MAX` 就只显示一个**窗口**（见 lbThumbFit / lbThumbShift）：
     两端那几枚渐隐 + 渐糊（"多于某个数就把两端的藏起来 / 两边模糊化 / 渐进渐出"），
     可见那一簇的中点永远落在容器中点上 ⇒ 翻页时**整条**左右平移；头尾那几枚时
     这一簇会短一些（越出数组两端了）但仍居中、当前张在簇里挪。没超上限时整条静止、只挪高亮。

     ⚠️ 三条不能省：
       ① 缩略图用 `item.thumb`（单册页给的是 480 缩图，**墙上已经加载过、直接命中缓存**；
          实测 52 枚 52/52 命中），没给才退回 `src`；
       ② 预览带的高度要进 `--lb-band`（CSS 的 `--lb-strip-h`），否则它会压到画面上；
       ③ 平移只改 track 的 `transform`（节点一个都不动）—— 所以"当前张长大 / 整条滑动"都是
          过渡在跑，不会闪。点哪张走哪张沿用原来的 `.dy-lb-thumb` 点击处理（也带 `dataset.i`）。 */
  var lbThumbTrack = null;
  var lbThumbK = 0;                 /* 这一组的**窗口**里放几枚（0 = 没画带子）。见 lbThumbFit */
  var lbThumbWinL = -1, lbThumbWinR = -1;   /* 上一步的**可见集**（判这一步要不要播平移） */
  var lbThumbLast = -1;             /* 上一步的当前张索引：只用来定折回入场的**方向** */

  /* 三个可调数（"多于某个数就把两端的藏起来"里的**某个数**就是第一个）：
       LB_THUMB_MAX  —— 最多同时显示几枚，多出来的藏在两端。**这是宽屏的上限**；
                        窄屏不用另设一档：lbThumbFit 会按容器宽反解，放不下就自动收窄
                        （390 宽 ⇒ 15 枚、320 宽 ⇒ 13 枚）。2026-09-21 晚主人
                        「电脑版上，预览照片的数量有点少了」⇒ 15 提到 25（25 枚 ≈ 590px）。
       LB_THUMB_FADE —— 两端各有几枚落在"渐隐 + 渐糊"的坡上（坡长，单位是"枚"）。
                        2026-09-22 主人「底部预览条模糊的部分太多了」⇒ 4 → **2**
                        （每侧真正带模糊的从 4 枚降到 1 枚；坡末端那枚透明度已经是 0，本来就看不见）。
       LB_THUMB_BLUR —— 坡末端（t = 1，即将看不见）那一刻的模糊量，px。3 → **2**
                        （坡中间那枚的模糊量因此从 1.5px 降到 1px，更收敛）。
     离当前张 d 枚的那一枚：t = (d − (half − FADE)) / FADE，夹到 [0,1]；
       t = 0 ⇒ 全亮不糊（＝改前那张的样子）；t = 1 ⇒ 透明 + 最糊。 */
  var LB_THUMB_MAX = 25, LB_THUMB_FADE = 2, LB_THUMB_BLUR = 2;

  /* 折回那一步的入场位移，单位 = **齿距**（非当前张宽 0.75·h + gap 4px ≈ 23.5px）。
     2026-09-27 · v12.6：折回照旧瞬时落位（不横扫 917px，见 lbDotsMark），但补一个短程滑入 ——
     走的距离约等于"普通翻一张"的一步半（≈35px），所以看起来就是一次翻页；
     为什么不是 0：位移给了**方向**（前进/后退），纯淡入会像"凭空换了一批"。
     ⚠️ 别往大了调（≥3 齿 就接近"扫过去"的观感了，那正是 2026-09-22 被否掉的那版）。 */
  var LB_THUMB_ENTER = 1.5;

  /* 窗口里放几枚：min(张数, LB_THUMB_MAX, 按容器宽算得出的枚数)，再调成**奇数**
     （奇数才有正中间那一枚，当前张才对得准）。 */
  /* 读 .dy-lb 上的一个长度 token（px）。 */
  function lbVarPx(name, dflt) {
    var v = parseFloat(getComputedStyle(lb).getPropertyValue(name));
    return isNaN(v) ? dflt : v;
  }

  function lbThumbFit(n) {
    var h = lbVarPx('--lb-thumb-h', 26);
    var w = h * 0.75, gap = 4;
    if (lbThumbTrack) gap = parseFloat(getComputedStyle(lbThumbTrack).columnGap) || gap;
    var cw = lbDots.clientWidth || 0;
    /* 整条（窗口）宽 = K·w + (h − w) + (K−1)·gap ≤ cw − 8（留 8px 喘气）⇒ 反解 K */
    var fit = Math.floor((cw - 8 - (h - w) + gap) / (w + gap));
    var k = Math.min(n, LB_THUMB_MAX, fit);
    /* ⚠️ **只有真要开窗口（k < n）时才需要奇数**（奇数才有正中间那一枚）。
       别在"全部放得下"时也把偶数砍成奇数：那样 16 张的相册在 1440 上会被当成
       "超上限"，白少一枚（还剩两端渐隐）—— MAX 从 15 提到 25 之后这个边界才暴露出来。 */
    if (k < n && k > 5 && k % 2 === 0) k--;
    return Math.max(1, Math.min(n, k));
  }

  /* 这一组在当前张为 a 时的**可见集** [lo, hi]（静态档就是整条）。 */
  function lbThumbWin(a) {
    var n = lbPhotos.length;
    if (n <= lbThumbK) return [0, n - 1];
    var half = (lbThumbK - 1) / 2;
    return [Math.max(0, a - half), Math.min(n - 1, a + half)];
  }

  /* 让位：当前张是正方形（h 宽）、其余是 0.75·h 的竖长条 ⇒ 它两侧各多占 0.125·h，
     两侧的每一枚都要让出这么多（用 transform，不碰布局）。槽位本身不动，
     所以"长方形变正方形"的过渡只发生在图身上，整条 track 一次都不用重排。
     ⚠️ 每步只有两枚的值真的变了（新的当前张、以及刚变成普通的那一枚），其余写回原值 = 不触发失效。 */
  function lbThumbGap(a) {
    if (!lbThumbTrack) return;
    var q = lbVarPx('--lb-thumb-h', 26) * 0.125, kids = lbThumbTrack.children, k, ii;
    for (k = 0; k < kids.length; k++) {
      ii = Number(kids[k].dataset.i);
      kids[k].style.setProperty('--lb-th-sh', ii === a ? '0px' : (ii < a ? '-' + q + 'px' : q + 'px'));
    }
  }

  function lbThumbShift() {
    if (!lbThumbTrack) return null;
    var cw = lbDots.clientWidth, n = lbPhotos.length, tx, lo, hi;
    var on = lbThumbTrack.querySelector('.dy-lb-thumb.is-on');
    if (!on) return null;
    var a = Number(on.dataset.i);
    var kids = lbThumbTrack.children;
    /* ⚠️ 对中一律用**视觉**边界（两档都是）：
       ① 让位（--lb-th-sh）与"当前张的图比槽位宽 0.125·h"这两件事都不在 offsetLeft 里；
       ② 静态档以前用 track.scrollWidth，而 scrollWidth 会把让位造成的**溢出**算进去
          （2026-09-22 实测：这样整条会偏 1.6px 左右）。
       当前张那枚：视觉左边 = 槽位左 − 0.125h、视觉宽 = h；其余：左边 = 槽位左 + 让位、宽 = 0.75h。 */
    var hh = lbVarPx('--lb-thumb-h', 26), qq = hh * 0.125;
    var shift = function (i) { return i === a ? 0 : (i < a ? -qq : qq); };
    var vleft = function (i) { return kids[i].offsetLeft + shift(i) - (i === a ? qq : 0); };
    var vwid = function (i) { return i === a ? hh : hh * 0.75; };
    if (n <= lbThumbK) {
      /* 这一组没超过上限（或窄屏也只放得下这么多）：整条都在 ⇒ **静止居中**，
         和改前一个观感（一排固定的缩略图，只挪高亮）。 */
      lo = 0; hi = n - 1;
    } else {
      /* 窗口：让**可见那一簇的中点**落在容器中点上 ⇒ 翻页时整条平移。
         可见集 = { i : |i − 当前张| ≤ half }（超出的一律 is-out、看不见），
         ⚠️ 必须用**可见集**而不是"固定的 K 枚窗口"来对中：头尾那几枚时两者不一样
            （当前张在 0 时，K 枚窗口是 [0..14] 但只有 [0..7] 看得见）——
            拿窗口去对中会让那 8 枚整个偏到左边、右边留一块死白（实测偏差 −82.75px）。
         当前张居中只在中间那一段成立；贴到首/末时这一簇会越出数组两端而变短，
         此时簇仍居中、当前张在簇里挪（跟相册类 App 的缩略图带一样）。 */
      var w = lbThumbWin(a); lo = w[0]; hi = w[1];
    }
    tx = cw / 2 - (vleft(lo) + vleft(hi) + vwid(hi)) / 2;
    lbThumbTrack.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,0,0)';
    return tx;                          /* 折回入场（lbThumbEnter）要拿它当终点 */
  }

  /* 折回那一步的**入场**（2026-09-27 · v12.6）：位置已经在 lbDotsMark 里瞬时落定，
     这里补一次「从行进方向再过去 LB_THUMB_ENTER 齿 + 全透明」→「终值 + 全亮」的过渡。
     主人原话：「从开头照片滑到尾部照片，底部预览照片没有过渡动画」——
     早先那版是整条横扫 917px（2026-09-22 嫌"卡"），这版只走 1.5 齿 ≈ 35px，
     和普通翻一张（23.5px）同量级 ⇒ 有过渡、又不糊。
     ⚠️ 手法与 is-jump 同源：先 inline `transition: none` 摆入场态 → 强制 reflow 落地 →
     清掉 inline 过渡 → 写终值，过渡就从**入场态**起跑（不是从旧位置）。
     直接写两次 transform 而不做 reflow 的话，浏览器只看到最后那个值 ⇒ 又变回硬切。 */
  function lbThumbEnter(tx, dir) {
    if (!lbThumbTrack) return;
    var hh = lbVarPx('--lb-thumb-h', 26);
    var gap = parseFloat(getComputedStyle(lbThumbTrack).columnGap) || 4;
    var d = (hh * 0.75 + gap) * LB_THUMB_ENTER;
    var st = lbThumbTrack.style;
    st.transition = 'none';
    st.transform = 'translate3d(' + (tx + dir * d).toFixed(1) + 'px,0,0)';
    st.opacity = '0';
    void lbThumbTrack.offsetWidth;      /* 入场态先落地 */
    st.transition = '';                 /* 交还给 .dy-lb-thumb-track 那两条过渡 */
    st.transform = 'translate3d(' + tx.toFixed(1) + 'px,0,0)';
    st.opacity = '1';
  }

  /* 两端那几枚的"渐隐 + 渐糊"：逐枚写 --lb-th-t（1 → 0）与 --lb-th-blur。
     看不见的那几枚**留在 DOM 里**（读屏照样念得到"第 N 张"），只是 CSS 给了 pointer-events: none。 */
  function lbThumbRamp(a) {
    if (!lbThumbTrack) return;
    var kids = lbThumbTrack.children, win = lbPhotos.length > lbThumbK;
    var half = (lbThumbK - 1) / 2, k, d, dist, t;
    for (k = 0; k < kids.length; k++) {
      d = kids[k];
      dist = Math.abs(Number(d.dataset.i) - a);
      if (!win) {                       /* 装得下全部 ⇒ 一个不隐不糊（＝改前的渲染） */
        d.style.removeProperty('--lb-th-t');
        d.style.removeProperty('--lb-th-blur');
        d.classList.remove('is-out');
        continue;
      }
      t = Math.min(1, Math.max(0, (dist - (half - LB_THUMB_FADE)) / LB_THUMB_FADE));
      if (t === 0) {
        d.style.removeProperty('--lb-th-t');
        d.style.removeProperty('--lb-th-blur');
      } else {
        d.style.setProperty('--lb-th-t', String(Math.round((1 - t) * 1000) / 1000));
        d.style.setProperty('--lb-th-blur', (t * LB_THUMB_BLUR).toFixed(2) + 'px');
      }
      d.classList.toggle('is-out', dist > half);
    }
  }

  function lbDotsMark(i) {
    if (!lbThumbTrack) return;
    var kids = lbThumbTrack.children, k;
    for (k = 0; k < kids.length; k++) {
      kids[k].classList.toggle('is-on', Number(kids[k].dataset.i) === i);
    }
    lbThumbGap(i);                       /* 让位：两侧各让出 0.125·h（走 transform） */
    /* 这一步要不要"跳过去"：
       与上一步的可见集**没有交集**（首↔末折回、或跨很远的跳）⇒ 位置不播过渡。
       预览带不像画面 —— 折回时没有空间连续性，那段 900 多像素的扫过会把整条糊成一片
       （2026-09-22 主人：「最开头滑到最尾 / 最尾滑到最开头，有点卡，动画不流畅」，
        实测 track 要走 917px，而普通翻一张只走 23px）。
       ⚠️ ramp 也得跟着 snap：折回后新那一簇的缩略图在上一步全是 is-out（opacity 0），
          不 snap 的话它们会从"全透明"渐显上来 —— 看起来像预览带先消失再浮现。
       🔴 2026-09-27 · v12.6（主人：「从开头照片滑倒尾部照片，底部预览照片没有过渡动画」）：
          "位置不播过渡"只留给**落位那一帧** —— 同一帧末尾摘掉 is-jump 之后，
          再补一次 lbThumbEnter（短程滑入 + 淡入）。落位仍是瞬时的（不横扫），
          但眼睛看到的是一次 300ms 的过渡，不再是硬切。
       ⚠️ 开箱那一帧（first）不补入场：那时整条正随灯箱一起淡入，再叠一次会闪。 */
    var first = lbThumbWinL < 0;            /* 本组第一次落位（开灯箱） */
    var w = lbThumbWin(i);
    var jump = !((w[0] <= lbThumbWinR) && (w[1] >= lbThumbWinL));
    if (jump) lbDots.classList.add('is-jump');
    lbThumbRamp(i);
    var tx = lbThumbShift();
    lbThumbWinL = w[0]; lbThumbWinR = w[1];
    if (jump) {
      void lbDots.offsetWidth;            /* 强制 reflow：让"无过渡这一版"先落地 */
      lbDots.classList.remove('is-jump'); /* 摘掉之后过渡照旧，正常翻页一点不受影响 */
      /* 方向按**环形**一步算（不是索引差）：折回是"走一步"绕过去的，
         |索引差| = n−1 ≠ 方向。所以照 lbWrapIdx 同一套取模取最短方向 ——
         末张 → 首张（前进）= +1：从右边滑进来；首张 → 末张（后退）= −1：从左边。
         与画面的进相方向（lbSwitchTo：下一张 inX = +32）口径一致。 */
      if (!first && lbThumbLast >= 0 && tx !== null) {
        var n = lbPhotos.length;
        var step = ((i - lbThumbLast) % n + n) % n;
        lbThumbEnter(tx, step <= n / 2 ? 1 : -1);
      }
    }
    lbThumbLast = i;
  }


  /* at 缺省 = 当前索引；传目标索引 = 提前把外壳切到"将要去的那张" */
  function lbSyncChrome(at) {
    var n = lbPhotos.length;
    var i = lbWrapIdx(at === undefined ? lbIndex : at);
    /* v11.8 环形：两端也能继续走（绕回另一端），箭头只在"只有一张图"时才禁用。
       "首图时上一张灰掉"在环形里没有意义；顺带也没有了"点灰箭头穿到遮罩 = 关灯箱"
       那个别扭（禁用态是 pointer-events:none，v9.42 起如此）。 */
    lbPrev.disabled = n < 2;
    lbNext.disabled = n < 2;
    lbDotsMark(i);
  }

  /* 【环形归一】v11.8：把任意索引折进 [0, n-1]。
     **环形的唯一真相点就是这里** —— 别在第二个地方再写一遍取模。 */
  function lbWrapIdx(i) {
    var n = lbPhotos.length;
    if (n < 1) return 0;
    return ((i % n) + n) % n;
  }

  /* 换图（终态）：把 lbIndex 设到 i 并把槽位归位。本身不带任何动画，
     动画只由 lbSwitchTo 挂 —— 两件事分开，才不会互相盖掉。 */
  function lbShow(i) {
    /* v11.6 这里兜底**夹紧**（越界一动不动），v11.8 起改成**折回另一端**。
       任何调用方算错也只会落到一张真实存在的照片上，不会把空槽位当当前张
       （后者 = 整块舞台空掉）。 */
    lbIndex = lbWrapIdx(i);
    lbFill();
  }

  /* ---------- 槽位 / 胶片几何 ---------- */

  /* 把一个槽位的内容换成 ph 的节点；已经就是同一个节点就不动。
     ⚠️ 换内容必须是【移动已解码的元素】，不能 `slot.innerHTML=''` 后新建 img —— 
     新建的那一帧还没解码，舞台又是 flex shrink-wrap，尺寸 0 会让整盒塌一下
     （v9.43 的老坑，这里是它在新结构里的形态）。 */
  function lbSlotPut(slot, ph) {
    var want = ph ? lbPick(ph) : null;
    if (slot.firstChild === want) return want;
    if (slot.firstChild) slot.removeChild(slot.firstChild);
    if (want) slot.appendChild(want);
    return want;
  }

  /* 同一槽位里那个节点的渲染宽度（translate 不影响 width，所以过渡中量也准） */
  function lbW(el) { return el ? el.getBoundingClientRect().width : 0; }

  /* 邻居的间距 = 半个当前 + 半个邻居 + 缝。**不能写固定步距** —— 同一条动态里
     1500×1125 / 1125×1500 / 1500×692 三种原比例，渲染宽度 955 / 537 / 1040 差近一倍，
     固定步距会让两张照片在拖动中叠在一起。
     ⚠️ v11.6：边界（hasP / hasN）改成按【索引】判，不再按"槽位里有没有节点"。
     槽位内容只决定几何（宽度），索引才是"还有没有上一张 / 下一张"的唯一真相 ——
     两者不一致时（例如手势快照 + 换图）按节点判会算出越界的目标。
     宽度仍按真实盒子量，两条路都留着。
     ⚠️ v11.8 环形：n ≥ 2 时**两端永远有邻居**（首张的上一张是末张），
     于是拖动不再有"拉到 0 就不动"的硬边界 —— 边界感消失正是环形要的效果。
     只有 n < 2 这一种情况下两侧才都没有邻居。宽度仍按真实盒子量：
     绕过来的是哪张，就按哪张的宽度算步距。 */
  function lbDims() {
    var n = lbPhotos.length;
    var hasP = n > 1, hasN = n > 1;
    var wc = lbW(lbSlotCur.firstChild), wp = lbW(lbSlotPrev.firstChild), wn = lbW(lbSlotNext.firstChild);
    return {
      c: wc, wp: wp, wn: wn, hasP: hasP, hasN: hasN,
      p: hasP ? (wc + wp) / 2 + LB_GAP : 0,
      n: hasN ? (wc + wn) / 2 + LB_GAP : 0
    };
  }

  /* 静止态：当前张归位到 0 / 实心，邻居各归各位【但透明】—— 所以静止时看到的
     仍然只有一张图（v11 不变式，v12 之后连拖动中也不露邻图）。
     ⚠️ 当前张的 opacity 必须显式写回 1：lbSwitchTo 的出相把**当前槽位**淡到 0，
     而换图之后新图恰好落进同一个槽位元素（节点是移动的，槽位不变）—— 少了这一行，
     每次切换完舞台就是全黑的。
     ⚠️ 邻居的 translate 值（±d.p / ±d.n）v12 之后纯属"摆着"，视觉上永远看不见；
     留着是因为 lbDims 要靠槽里的节点量宽度（提交阈值按步距算），以及 ?lbdebug 的
     off 数组仍然读它。别以为它们还有动画含义。 */
  function lbRest() {
    var d = lbDims(), k;
    for (k = 0; k < 3; k++) lbFx0(lbSlots[k]);
    lbSlotCur.style.transform = 'translateX(0px)';
    lbSlotPrev.style.transform = 'translateX(' + (-d.p) + 'px)';
    lbSlotNext.style.transform = 'translateX(' + (d.n) + 'px)';
    lbSlotCur.style.opacity = '1';
    lbSlotPrev.style.opacity = '0';
    lbSlotNext.style.opacity = '0';
  }

  /* 拖动跟手（v12）：**只动当前张**。
     参考站的舞台上任何时刻只有一张图（mode="out-in"），所以跟手也不露邻图 ——
     邻图槽位全程压在 opacity:0（它们还在，只是不参与，理由见 lbDims 的注释）。
     位移由 lbDragVis 算好（阻尼 + 封顶 32px）再传进来。 */
  function lbShift(v) {
    lbSlotCur.style.transform = 'translateX(' + v + 'px)';
    lbSlotPrev.style.opacity = '0';
    lbSlotNext.style.opacity = '0';
  }

  /* 跟手位移：手指位移 → 画面位移。damp 之后**硬封顶**在 32px。
     ⚠️ 封顶值刻意等于出相终点（LB_NUDGE）—— 于是"拖到顶再松手"与"出相"是同一点，
     中间不会有一跳。别把这里改成整步步距：v12 之后一步的位移就是 32px。 */
  function lbDragVis(dx) {
    var v = dx * LB_DRAG_DAMP;
    if (v > LB_DRAG_CAP) v = LB_DRAG_CAP;
    if (v < -LB_DRAG_CAP) v = -LB_DRAG_CAP;
    return v;
  }

  /* 按 lbIndex 把三个槽位摆好（终态，无动画） */
  function lbFill() {
    var n = lbPhotos.length;
    lbNode = lbSlotPut(lbSlotCur, lbPhotos[lbIndex]);
    /* 邻居按环形取：首张的上一张 = 末张，末张的下一张 = 首张。
       槽位里放的是真图，所以"绕过来"的那张按它自己的宽高比滑进来。 */
    lbSlotPut(lbSlotPrev, n > 1 ? lbPhotos[lbWrapIdx(lbIndex - 1)] : null);
    lbSlotPut(lbSlotNext, n > 1 ? lbPhotos[lbWrapIdx(lbIndex + 1)] : null);
    lbRest();
    lbSyncChrome();
    lbSyncCap();          /* 说明行跟画面走（不跟圆点提前走）*/
    lbWarmNear(lbIndex);
    /* v11.9：静止态邻居的位置是按【渲染宽度】算的，而刚搬进槽位的 <img> 可能还没解码
       （宽度 0）⇒ 邻居会被摆在"半格"而不是一整步的位置上。静止时它透明看不见，
       但下一次拖动的第一帧会按新鲜宽度重摆 —— 那次位置跳变恰好落在邻图开始渐显的
       时刻，于是"绕回来的那张"进场起点与正常翻页不一样（主人要的是同形）。
       解码完再摆一次即可（只在 idle 且没在拖动时；宽度一旦非 0 不会再触发）。 */
    for (var s = 0; s < 3; s++) {
      var el = lbSlots[s].firstChild;
      if (el && el.tagName === 'IMG' && !el.naturalWidth && el.decode) {
        el.decode().then(lbRestFix, lbRestFix);
      }
    }
  }
  function lbRestFix() { if (lbPhase === 'idle' && !lbDrag) lbRest(); }

  /* 把当前这一段立刻推到终点（连点箭头 / 方向键连发时用）。
     不排队、不吞输入：先落定，再从落定后的索引起新的一段。
     🔴 v12.1（09-15 21:31 主人「连续滑动图片不是很流畅」）：**"推到终点"必须真的是终点**。
     v12 只在进相成立 —— 出相中途落定会把那次切换【取消】掉（那时 lbIndex 还没改），
     画面往回弹。实测的后果：连续拖动 5 次只走掉 1 张，屏幕上还能看到 -32px 弹回 0 的那一下。
     现在 lbIndex 在【开段那一刻】就提交（见 lbSwitchTo），所以两种相位都落在新图上：
       · 出相中途落定 → 内容还没换（lbFill 本来在空档里才跑）⇒ 这里补一次 lbFill()
       · 进相中途落定 → 内容已经换了 ⇒ lbRest() 就够
     ⚠️ lbSeq 必须在这里 +1：出→进之间挂着两个 rAF 回调，落定后它们若还活着，
        会把紧接着开的新一段盖掉（新一段刚起步就被写回 0 / 实心）。 */
  function lbSettle() {
    if (lbTimer) { clearTimeout(lbTimer); lbTimer = null; }
    lbSeq++;
    if (lbPhase === 'out') lbFill();   /* 补上没做完的换图：落定 = 那一步照走，不回退 */
    lbPhase = 'idle';
    lbTo = lbIndex;
    lbDrag = null; lbDragDim = null;
    lbWheel.acc = 0; lbWheel.dir = 0; lbWheel.lock = false;
    if (lbTp) lbTp.reset();   /* 手势边界也一起清：落定之后下一条事件算"新手势" */
    lb.classList.remove('is-dragging');
    lbRest();
  }

  /* ================= 唯一的切换动画：32px 出-进淡滑（v12）=================
     箭头 / ←→ / 圆点 / 拖动松手 / 触控板，全部落到 lbSwitchTo 一处。
     v11.7 曾把这里统一成"整条胶片平移一步"，v12（09-15）主人指定换回参考站那套 ——
     注意两次都是**同一个诉求**（全站只能有一套切换动画），只是选中的那一套不同。
     --------------------------------------------------------------------------- */

  /* 跳到第 target 张（点击圆点用；箭头走 lbGo(dir)）。
     v12 之后这条通路比 v11.9 **简单得多**：一步的动画与"翻一张"完全同形（都只是
     32px 两段），所以不再需要"先把目标摆进屏外邻居槽再滑一步"那一套 ——
     目标只在出相结束、换图那一刻才被搬进当前槽位（lbSwitchTo 内部做）。
     ⚠️ 唯一要守的是**解码**：换图时节点宽度为 0 会让舞台塌一帧（v9.43 的老坑），
     所以先把目标 decode 好再开动画 —— 近邻由 lbWarmNear 预热，远的靠这里现等。
     ⚠️ **方向**（v12 第一次写就错了，探针抓到）：
       · 走"上一张 / 下一张"意图的通路（箭头 / ←→ 键）必须把意图**传进来**，
         不能按 target 与 lbIndex 的数值大小反推 —— 环形下首图的上一张是末张，
         数值差是负的，反推出来的方向正好相反（首图按上一张变成"往左出、从右进"，
         与"末张该从左边进来"相反，正是主人 v11.9 上报过的那件事）。
       · 点圆点才算数值方向：圆点在底栏从左到右排，点右边的圆点就该"往右走"。
     教训与 v11.9 同一条：**环形里任何"数值"判断都要让位给环形判断**。 */
  function lbGoSlide(target, forceDir) {
    var n = lbPhotos.length;
    if (n < 2 || !lbNode) return;
    if (lbPhase !== 'idle') lbSettle();
    target = lbWrapIdx(target);              /* v11.8 环形：越界即折回另一端 */
    if (target === lbIndex) return;
    var nxt = lbWrapIdx(lbIndex + 1), prv = lbWrapIdx(lbIndex - 1);
    var dir = forceDir ? forceDir
      : (target === nxt ? 1 : (target === prv ? -1 : (target > lbIndex ? 1 : -1)));
    var ph = lbPhotos[target];
    lbWarmSrc(ph.src);
    var go = function () { lbSwitchTo(dir, target); };
    var im = lbWarm[ph.src];
    if (im && !im.naturalWidth && im.decode) im.decode().then(go).catch(go);
    else go();
  }

  /* 键盘 ←→ / 左右箭头：目标恒为 ±1，越界由 lbWrapIdx 折回另一端（v11.8 环形）。
     ⚠️ 必须先把**方向意图**显式传下去（forceDir）：环形下"上一张"的落点在数值上
     可能大于当前索引（首图的上一张 = 末张），让 lbGoSlide 按数值反推方向会反。
     ⚠️ 必须先 lbSettle 再算目标索引：lbIndex 是**换图那一刻**才更新的，上一段还在飞
     的时候直接读 lbIndex 会读到旧值 ⇒ 连点两下只走一张（验收 8.4 抓到的）。 */
  function lbGo(dir) {
    if (lbPhotos.length < 2) return;
    if (lbPhase !== 'idle') lbSettle();
    var d = dir > 0 ? 1 : -1;
    lbGoSlide(lbIndex + d, d);
  }

  /* ================= 拖动 / 触控板：与点击共用同一条动画（v12）=================
     "一次滑动一张"仍然成立，而且现在更彻底：目标在手势【开始】时就锁成 ±1，
     松手只决定方向、不决定距离（Embla skipSnaps:false / Swiper 非 freeMode /
     ItemSlide oneItem 都是这一句）。v12 起点击与滑动**共用 lbSwitchTo**，
     所以"两套动画不一致"这件事在结构上不可能再发生。
     ==================================================================== */

  var lbDrag = null;        /* 拖动中的手势：{id,x0,y0,axis,v,raw,moved,hist}
                               v = 画面位移（阻尼+封顶），raw = 原始手指位移（判提交） */
  var lbDragDim = null;     /* 手势开始时的胶片几何；中途不重量，免得步距抖动 */
  var lbClickMute = 0;      /* 拖完到这个时刻之前忽略 click（否则指针落在图外会误关） */
  var lbWheel = { acc: 0, dir: 0, lock: false, dim: null };
  /* ⚠️ v12.3 删掉了 lbWheel.last（"上一条事件的时间戳"）—— v12.2 拿它算"静默 > 70ms"，
     而那个判据是错的（见 LB_WHEEL_MIN 上面那段）。现在时间账由 lbTp 里的
     "手势结束门槛"负责，它按事件间隔自适应。 */

  function lbCommitDist(step) {
    if (!step) return LB_COMMIT_MAX;
    return Math.max(LB_COMMIT_MIN, Math.min(step * LB_COMMIT_FRAC, LB_COMMIT_MAX));
  }

  /* ============ 唯一的切换动画（v12）：32px 出-进两段淡滑 ============
     参考站实测（2026-09-15，逐帧 + getAnimations() 双口径核对）：
       出：transform → translateX(∓32px)，opacity 1 → 0，150ms，cubic-bezier(.4,0,1,1)
       进：从 translateX(±32px) / opacity 0 → 0 / 1，150ms，cubic-bezier(0,0,.2,1)
     两段**顺序**执行（Vue <Transition mode="out-in">），不重叠 ⇒ 舞台上任何时刻只有一张图。
     方向按导航方向镜像：下一张 = 旧图往左出、新图从右边进；上一张 = 反过来。
     ⚠️ 换图发生在 out 相结束的那一帧（lbFill 把目标节点搬进当前槽位）——
        lbIndex 也在那一刻改，所以"落定"与"到位"的语义自动对齐（见 lbSettle）。
     ⚠️ "一次滑动只能滑一张"的唯一实现点仍然在这里：默认 target = lbIndex ± 1，
        与手势走了多远、甩得多快都无关 —— 距离与速度只决定【要不要走】。
        唯一例外是点圆点跨多张（lbGoSlide 显式传 target）：走的还是**同一段动画**，
        只是落点不是邻居。 */
  function lbSwitchTo(dir, targetIdx) {
    var n = lbPhotos.length;
    if (n < 2 || !lbNode) return;
    dir = dir > 0 ? 1 : -1;
    var target = (targetIdx === undefined || targetIdx === null) ? lbIndex + dir : targetIdx;
    target = lbWrapIdx(target);              /* v11.8 环形：越界即折回另一端 */
    if (target === lbIndex) return;

    var outMs = lbMs(LB_OUT_MS), inMs = lbMs(LB_IN_MS), gapMs = lbMs(LB_SWAP_GAP);
    var outX = -LB_NUDGE * dir;              /* 出相终点（下一张 → -32，上一张 → +32） */
    var inX = LB_NUDGE * dir;                /* 进相起点：从出相的反侧来 */
    var seq = ++lbSeq;
    /* 🔴 v12.1：lbIndex 在【开段这一刻】就提交，不再等"换图"那一帧 —— 这是"不吞输入"的
       前提：任何相位被打断或落定，落点都是**这一段的终点**，永远不会往回弹（见 lbSettle）。
       内容仍然只在出相结束、空档里才换（lbFill），所以观感还是"先淡干净、再淡进来"。
       ⚠️ 代价：出相那 190ms 里，"索引"比"槽位里摆着的图"早一步 —— 槽位只在 lbFill
          那一刻才真的换。所以出相里量出来的步距（lbDims）可能还是上一张的，
          只影响提交阈值的估算，不影响"一步 = 32px"这条契约。 */
    lbIndex = target;
    lbTo = target;

    lbFx(lbSlotCur, outMs, LB_OUT_EASE, outMs, LB_OUT_EASE, 0);
    lbSlotCur.style.transform = 'translateX(' + outX + 'px)';
    lbSlotCur.style.opacity = '0';

    lbPhase = 'out';
    lbSyncChrome(target);                    /* 圆点 / 箭头点下即动（v11.3 的行为） */
    lbTimer = setTimeout(function () {
      if (seq !== lbSeq) return;             /* 已被落定或新一段顶掉 */
      lbTimer = null;
      /* —— 换图：目标节点搬进当前槽位（搬的是已解码的同一个 <img>，像素不变），
            然后从反侧 32px / 透明处开始"进" ——（索引早在开段时就提交了，这里只换内容） */
      lbFill();                              /* 重摆三槽（含环形邻居）+ 归位（无过渡） */
      lbFx0(lbSlotCur);
      lbSlotCur.style.transform = 'translateX(' + inX + 'px)';
      lbSlotCur.style.opacity = '0';
      /* 🔴 v12.2：同一帧里"写 transition + 写终值"会被合并成"没有过渡"
         （浏览器只在样式重算后才发现 transition 变了）—— 症状是新图直接出现、没有进相。
         老写法是**等两个 rAF** 把起点刷进去。那是**和帧率绑死**的：60fps 下两个 rAF ≈33ms
         还能忍，本机常态 27fps 时两个 rAF 就是 ~54ms，叠在 gapMs 40ms 上，
         out-in 的空档实测从设计值 40ms 涨到 **135ms** —— 每切一张都白等这么久，
         这就是"不流畅"里能量出来的那一块。
         ✅ 改成**读一次 offsetWidth** 强制重算样式：同一个任务里就能挂过渡，
            空档回到 ~40ms，而且**与帧率无关**。这是标准做法，但必须验证：
            套件里"进相挂的是 150ms ease-out / 进相单调回 0 / 起点真的在屏外那侧"
            三条会立刻抓住"过渡没挂上"这种退化。 */
      void lbSlotCur.offsetWidth;
      lbFx(lbSlotCur, inMs, LB_IN_EASE, inMs, LB_IN_EASE, 0);
      lbSlotCur.style.transform = 'translateX(0px)';
      lbSlotCur.style.opacity = '1';
      lbPhase = 'in';
      lbTimer = setTimeout(function () {
        if (seq !== lbSeq) return;
        lbTimer = null;
        lbPhase = 'idle';
        lbRest();                        /* 收尾归位（无过渡，值本来就一样） */
      }, inMs + 16);
    }, outMs + gapMs);
  }

  /* 拖动位移的封顶见上面的 lbDragVis —— **没有橡皮筋**（主人「我不喜欢反弹动画」）：
     到顶就不动，松手也不会往回弹。于是拖动的手感只有两种状态：跟手，或者不动；
     松手时要么提交，要么瞬间归位。 */

  lbStage.addEventListener('pointerdown', function (e) {
    if (!lb.classList.contains('is-open')) return;
    if (e.button) return;                       /* 只认主键 / 触摸 / 笔 */
    if (lbPhotos.length < 2) return;
    /* 🔴 v12.1：这里**不再** lbSettle()。原来一按下就把正在跑的淡滑落定，
       于是任何一次"点一下"（包括点到图外想关灯箱）都会把动画砍掉。
       改成等轴向判明、真的开始横向拖了再落定（见 pointermove）。 */
    lbDrag = {
      id: e.pointerId, x0: e.clientX, y0: e.clientY,
      axis: 0, v: 0, raw: 0, moved: false,
      hist: [{ x: e.clientX, t: performance.now() }]
    };
    lbDragDim = lbDims();
  });

  window.addEventListener('pointermove', function (e) {
    if (!lbDrag || e.pointerId !== lbDrag.id) return;
    var dx = e.clientX - lbDrag.x0, dy = e.clientY - lbDrag.y0;
    if (!lbDrag.axis) {
      if (Math.abs(dx) < LB_DRAG_MIN && Math.abs(dy) < LB_DRAG_MIN) return;
      lbDrag.axis = Math.abs(dx) > Math.abs(dy) ? 1 : 2;
      if (lbDrag.axis === 2) { lbDrag = null; return; }   /* 竖滑不接管 */
      /* 真开始横向拖了 —— 这时才把在跑的那一段推到终点（v12.1 起落定只会【向前】，
         不会把已经提交的那一步取消掉）。落定后重新量几何：刚换过图，步距可能变了。
         ⚠️ lbSettle() 会把 lbDrag 清掉（它假设"落定 = 这次手势作废"），但这里
            这一次手势正是【我们自己】—— 清完必须放回去，否则下面第一行就抛空指针。 */
      if (lbPhase !== 'idle') {
        var keepDrag = lbDrag;
        lbSettle();
        lbDrag = keepDrag;
        lbDragDim = lbDims();
      }
      lb.classList.add('is-dragging');
      lbFx0(lbSlotPrev); lbFx0(lbSlotCur); lbFx0(lbSlotNext);  /* 跟手：必须无过渡 */
    }
    if (e.cancelable) e.preventDefault();
    /* ⚠️ v12：raw 与 v 必须分开。raw = 真实手指位移（**提交判据**用），
       v = 画面位移（阻尼后封顶在 32px，**只用来摆画面**）。
       合成一个数的后果实测踩过：画面被封顶在 32px，拿它去比 110px 的提交线，
       永远过不了 ⇒ 拖到底也翻不了页。 */
    lbDrag.raw = dx;
    lbDrag.v = lbDragVis(dx);
    lbDrag.moved = true;
    var now = performance.now();
    lbDrag.hist.push({ x: e.clientX, t: now });
    while (lbDrag.hist.length > 2 && now - lbDrag.hist[0].t > 90) lbDrag.hist.shift();
    lbShift(lbDrag.v);
  }, { passive: false });

  function lbDragEnd(e) {
    if (!lbDrag || (e && e.pointerId !== lbDrag.id)) return;
    var g = lbDrag, dim = lbDragDim;
    lbDrag = null; lbDragDim = null;
    if (!g.axis || !g.moved) return;            /* 只是点了一下 → 交给 click 逻辑 */
    lb.classList.remove('is-dragging');
    lbClickMute = performance.now() + LB_CLICK_MUTE;

    var v = g.raw;                              /* ← 判据用原始手指位移，不是画面位移 */
    var a = g.hist[0], b = g.hist[g.hist.length - 1];
    var vel = (b.x - a.x) / Math.max(1, b.t - a.t);    /* px/ms，右正左负 */
    var dir = 0;
    if (v <= -lbCommitDist(dim.n) || (vel < -LB_FLICK && v < -LB_FLICK_MIN)) dir = 1;
    else if (v >= lbCommitDist(dim.p) || (vel > LB_FLICK && v > LB_FLICK_MIN)) dir = -1;
    /* v11.6 在这里把两端的 dir 清零（"不外绕"）；v11.8 环形取消 ——
       首图继续往左拖、末图继续往右拖都照常提交，落点由 lbWrapIdx 折到另一端。 */

    if (dir) { lbSwitchTo(dir); return; }

    /* 没过阈值 → **瞬间归位，没有过渡**（主人「我不喜欢反弹动画」）。
       原来这里要走 130~280ms 的 ease-out 滑回去，那一小段"动一下再回来"就是他不喜欢的。
       lbRest 内部先 lbFx0（transition:none）再写终值，所以这一步是同步落定的 ——
       松手当帧就在原位，不存在任何回位动画。
       v12 之后跳跃幅度最多 32px（跟手封顶值），比 v11 的 ≤110px 小得多。 */
    lbRest();
    lbPhase = 'idle';
    lbTo = lbIndex;
  }
  window.addEventListener('pointerup', lbDragEnd);
  window.addEventListener('pointercancel', lbDragEnd);

  /* ===== 触控板手势边界探测器（v12.3）=====
     惯性判据移植自 wheel-gestures（MIT © xiel）—— 常量一个字没改；另外两条
     （突降 / 静默门槛）是我们加的，理由与实测见 LB_WHEEL_MIN 上面那段长注释。
     feed(dx, dy, t) 返回 { start, momentum, cancel, cliff }：
       · momentum = 现在在**惯性尾巴**里（手指已离开）⇒ 调用方一条都不许算
       · start    = 这条事件开启了新手势（上一手势已结束，或就没有过）
       · cancel   = 手指**砸**下来（库判据：已在惯性里，且 |Δ| > 上一拍 ×2）
       · cliff    = 手指**轻轻**落下（平滑衰减 4 拍后突然单拍掉一半以下）
     最后两个都是"新的一次手指动作开始了"的证据 ⇒ 解掉"一次手势一张"的锁。 */
  function lbTpNew() {
    var started = false, momentum = false, lastAbs = 0, willEndMs = LB_TP_END_FLOOR;
    var toMerge = [], points = [], vel = [0, 0], accs = [], startPub = false, negZero = false;
    var timer = null, ratioRun = 0;
    var res = { start: false, momentum: false, cancel: false, cliff: false };

    function reset() {
      if (timer) { clearTimeout(timer); timer = null; }
      started = false; momentum = false; lastAbs = 0; willEndMs = LB_TP_END_FLOOR;
      toMerge = []; points = []; vel = [0, 0]; accs = []; startPub = false; negZero = false;
      ratioRun = 0;
    }
    function start() { reset(); started = true; }
    function end() { started = false; momentum = false; }
    function arm() { if (timer) clearTimeout(timer); timer = setTimeout(end, willEndMs); }
    function rateInRange(f) { return f === 0 ? true : (f >= LB_TP_ACC_MIN && f <= LB_TP_ACC_MAX); }
    /* 库原逻辑：最近 5 个取样点的逐轴速度比都要落带（0 轴算通过） */
    function detect() {
      if (accs.length < LB_TP_ANALYZE) return;
      if (negZero) {   /* Windows + Blink 的"手指离开"专用事件（macOS 上不会出现） */
        negZero = false;
        if (Math.abs(vel[0]) >= 0.2 || Math.abs(vel[1]) >= 0.2) momentum = true;
      }
      var recent = accs.slice(-LB_TP_ANALYZE), ok = true, i, k;
      for (i = 0; i < recent.length && ok; i++) {
        for (k = 0; k < recent[i].length; k++) if (!rateInRange(recent[i][k])) { ok = false; break; }
      }
      if (ok) momentum = true;
      accs = recent;
    }
    function setWillEnd(dt) {
      var nt = Math.ceil(dt / 10) * 10 * 1.2;
      if (!momentum) nt = Math.max(100, nt * 2);      /* 库原式 */
      willEndMs = Math.min(1000, Math.round(Math.max(nt, LB_TP_END_FLOOR)));
    }
    /* 每 LB_TP_MERGE 条事件合成一个速度取样点，用相邻两点算逐轴加速比 */
    function merge() {
      if (toMerge.length === LB_TP_MERGE) {
        var d = [0, 0], t = 0, j;
        for (j = 0; j < toMerge.length; j++) { d[0] += toMerge[j][0]; d[1] += toMerge[j][1]; t += toMerge[j][2]; }
        t /= LB_TP_MERGE;
        var prevPoint = points[0];
        points[0] = [d, t];
        if (prevPoint) {
          var dt = t - prevPoint[1];
          if (dt > 0) {
            var v = [d[0] / dt, d[1] / dt];
            accs.push([v[0] / (vel[0] || 1), v[1] / (vel[1] || 1)]);
            vel = v;
            setWillEnd(dt);
          }
        }
        toMerge = [];
        if (!momentum) detect();
      } else if (!startPub && toMerge.length) {
        /* 手势的第一条：还没有速度，先拿它当起点（库的 updateStartVelocity） */
        var l = toMerge[toMerge.length - 1];
        vel = [l[0] / willEndMs, l[1] / willEndMs];
      }
    }
    return {
      reset: reset,
      feed: function (dx, dy, t) {
        var dmax = Math.max(Math.abs(dx), Math.abs(dy));
        res.start = false; res.cancel = false; res.cliff = false;
        if (!started) { start(); res.start = true; }
        else if (momentum && dmax > Math.max(LB_TP_CANCEL_MIN, lastAbs * LB_TP_CANCEL_JUMP)) {
          end(); res.cancel = true; start(); res.start = true;
        }
        if (dmax === 0 && typeof Object.is === 'function' && Object.is(dx, -0)) {
          negZero = true;                      /* 零位移事件不许影响速度（库原样） */
          res.momentum = momentum;
          return res;
        }
        /* ② 突降：连续平滑衰减之后，单拍掉到一半以下 ⇒ 手指落下（macOS 停惯性的报信） */
        if (lastAbs > 0) {
          var r = dmax / lastAbs;
          if (r <= LB_TP_CLIFF && ratioRun >= LB_TP_SMOOTH) { ratioRun = 0; res.cliff = true; }
          else if (r >= 0.7 && r <= 1.0) ratioRun++;
          else ratioRun = 0;
        }
        lastAbs = dmax;
        toMerge.push([dx, dy, t]);
        merge();
        res.momentum = momentum;
        startPub = true;
        arm();
        return res;
      }
    };
  }
  var lbTp = lbTpNew();

  /* ===== 箭头：默认藏着，指针**靠近**才显形（2026-09-22 主人「隐藏浏览照片左右滑动的
     按钮，但鼠标滑动按钮附近，按钮才显示」）=====
     判据用**箭头自己的矩形**往外扩一圈（LB_NEAR_PAD），而不是"离屏幕边缘多少 px" ——
     箭头位置是可调的（CSS 里 left/right），扩矩形跟着它走，改位置不用改这里。
     ⚠️ 只在 pointerType 不是 touch 时算：触屏上箭头本来 display:none，
        这里再算只是白烧电（触屏也没有任何"鼠标靠近"的语义）。
     ⚠️ rAF 节流：一帧能来好几条 pointermove，直接改 class 会一直触发布局。 */
  var LB_NEAR_PAD = 96;
  var lbNearRaf = 0, lbNearPt = null, lbNearState = 0;
  function lbNearApply() {
    lbNearRaf = 0;
    var p = lbNearPt;
    if (!p) return;
    var near = 0;
    if (lbPrev) {
      var r = lbPrev.getBoundingClientRect();
      if (p.x >= r.left - LB_NEAR_PAD && p.x <= r.right + LB_NEAR_PAD &&
          p.y >= r.top - LB_NEAR_PAD && p.y <= r.bottom + LB_NEAR_PAD) near = 1;
    }
    if (!near && lbNext) {
      var r2 = lbNext.getBoundingClientRect();
      if (p.x >= r2.left - LB_NEAR_PAD && p.x <= r2.right + LB_NEAR_PAD &&
          p.y >= r2.top - LB_NEAR_PAD && p.y <= r2.bottom + LB_NEAR_PAD) near = 2;
    }
    if (near === lbNearState) return;
    lbNearState = near;
    if (lbPrev) lbPrev.classList.toggle('is-near', near === 1);
    if (lbNext) lbNext.classList.toggle('is-near', near === 2);
  }
  window.addEventListener('pointermove', function (e) {
    if (!lb.classList.contains('is-open')) return;
    if (e.pointerType === 'touch') return;
    lbNearPt = { x: e.clientX, y: e.clientY };
    if (!lbNearRaf) lbNearRaf = requestAnimationFrame(lbNearApply);
  });
  /* 灯箱一开、一关都把"靠近"清掉：否则关掉再开，按钮会带着上一次的显形态。
     （`lbNearApply` 是函数声明，提升过了，open/close 里可以直接调。） */
  function lbNearReset() {
    lbNearState = 0; lbNearPt = null;
    if (lbPrev) lbPrev.classList.remove('is-near');
    if (lbNext) lbNext.classList.remove('is-near');
  }

  /* 触控板双指横扫：deltaX 驱动同一条动画。竖滑（deltaY）自 2026-09-22 起**同样接管**
     —— 主轴判定见下面 vert 那一行；两条轴共用这个探测器。
     "一次滑动一张"在这条路径上最难 —— macOS 松手后的惯性尾巴会连来几十条事件
     （v10.2 / v273 都栽在这）。做法分两层：
       · **台阶一**：惯性期的事件一条都不算（不累加 acc），所以不管甩得多猛、
         尾巴多长，都不可能多走一张。这一层是硬的。
       · **台阶二**：`lock` 保证"一次手指动作只走一张"；解锁口只有 lbTp 报的三个
         "新的手指动作开始了"（start / cancel / cliff）。
     ⚠️ v12.2 在这里放过一条 `fresh`（静默 > 70ms）当唯一解锁口 —— 那是错的，
        尾巴会把静默永远占着 ⇒ 不能连续滑。别再退回去。
     ⚠️⚠️ **两行的顺序是硬的，别"顺手精简"成 `if (st.momentum) return;`**：
        `start` / `cancel` 不可能与 momentum 同时为真（cancel 自己先 end()），
        但 **`cliff` 可以** —— 离线复现拿 66 个样本（12 段真机录制 + 连甩 + 拼接口）
        数过：**61 次解锁里有 38 次发生在 momentum 已确认为真那一拍**
        （`tp-invariant.js`）。写成无条件 `if (st.momentum) return;` 会把那 38 次
        全吃掉 ⇒ 又是"滑了它不动"。所以必须带 `&& !unlocked`。
        这条也正是离线复现里的写法（`if (st.momentum && !extra) continue;`）；
        页面与复现**必须逐字一致**，否则"套件全绿"证明的不是这份实现。 */
  window.addEventListener('wheel', function (e) {
    if (!lb.classList.contains('is-open')) return;
    /* 触控板的**捏合**（macOS 上表现为 ctrl+wheel）是缩放、不是翻页：
       不拦的话，刚才那句"竖滑也接管"会把捏合变成翻页。 */
    if (e.ctrlKey) return;
    var dx = e.deltaX, dy = e.deltaY;
    /* 🔴 主轴判定（v13.2，2026-09-22 主人「触控板上下滑动也能滑动照片」）：
       `|dx| >= |dy|` 走横滑 —— 这条路径与改前**逐字相同**（同一个 feed(dx, dy)、
       同一个 acc += dx）；否则竖滑为真，把 deltaY 当主轴。
       ⚠️ 两条轴喂**同一个** lbTp：一次接触里轴心漂移时，两个探测器会各自判
          start/cancel/cliff、各自解锁 ⇒ "一次滑动一张"立刻破掉。feed 的加速比
          判据逐轴对称，所以竖滑的惯性尾巴照样认得出来。
       ⚠️ 方向刻意与横滑同源：deltaY > 0（两指上滑 = macOS 自然滚动）＝ 下一张，
          因为再往下那条 `var dir = lbWheel.acc > 0 ? 1 : -1;` 一个字没改。 */
    var vert = Math.abs(dy) > Math.abs(dx);
    var ax = vert ? dy : dx;
    if (!ax) return;
    e.preventDefault();
    var now = (typeof e.timeStamp === 'number' && e.timeStamp > 0) ? e.timeStamp : performance.now();
    var st = vert ? lbTp.feed(dy, dx, now) : lbTp.feed(dx, dy, now);
    /* 离散滚轮档（见上面 LB_NOTCH_MIN 那段）：解开"上一次动作已经走掉一张"的锁。 */
    var notch = !st.momentum && Math.abs(ax) >= LB_NOTCH_MIN &&
                (now - lbLastWheelT) >= LB_NOTCH_GAP;
    lbLastWheelT = now;
    if (notch) { lbWheel.lock = false; lbWheel.acc = 0; }
    var unlocked = st.start || st.cancel || st.cliff;
    if (st.momentum && !unlocked) { lbWheel.acc = 0; return; }   /* 惯性尾巴：一条都不算 */
    if (unlocked) {
      lbWheel.acc = 0; lbWheel.lock = false;
      /* v11.6 起 dim 每条【新手势】都重抓：步距按真实渲染宽度算，换过图就变了。 */
      lbWheel.dim = lbDims();
    }
    if (!lbWheel.dim) lbWheel.dim = lbDims();   /* 兜底：灯箱刚开、还没量过几何 */
    if (lbWheel.lock) return;                  /* 这次手指动作已经走掉一张了 */
    /* 🔴 v12.1：这里原来有一条 `if (lbPhase !== 'idle') return;` —— 淡滑中来的
       【新手势】会被整条丢掉（它的头几个事件进不来、acc 一直是 0，只剩尾巴在凑数），
       实测连发 6 条只走 5 张，而且还出现过 ~1.8s 的死区（"我滑了它不动"）。
       lbSwitchTo 本身可被打断：新一段从【当前渲染位置】接着走，CSS 过渡自动连续，
       所以不再需要这道闸。"一条手势一张"仍由上面的 lock 保证。 */
    lbWheel.acc += ax;                         /* v13.2：竖滑时这里累加的是 dy */
    if (Math.abs(lbWheel.acc) < LB_WHEEL_MIN) return;
    var dir = lbWheel.acc > 0 ? 1 : -1;
    /* v11.8 环形：两端都能继续走，所以不再有"被边界挡下"的分支；
       只有真的只有一张（hasP / hasN 同时为 false）时才把那笔账清掉，
       否则欠着的位移会让反方向"滑半天没反应"。 */
    if (!lbWheel.dim.hasN && !lbWheel.dim.hasP) { lbWheel.acc = 0; return; }
    lbWheel.dir = dir;
    lbWheel.lock = true;                       /* ← 一次手指动作只走一张 */
    lbSwitchTo(dir);
  }, { passive: false });

  /* 载入一组照片并直接停在 idx 张 */
  function lbMount(list, idx) {
    lbSettle();
    for (var s = 0; s < 3; s++) {
      if (lbSlots[s].firstChild) lbSlots[s].removeChild(lbSlots[s].firstChild);
    }
    lbNode = null;
    lbPhotos = list;
    idx = idx < 0 ? 0 : (idx > list.length - 1 ? list.length - 1 : idx);   /* v11.6 夹紧 */
    lbIndex = idx;

    /* 底部预览带（见「底部预览带」那段）。建节点只在开箱时做一次，之后翻页只切 class / 挪 transform。 */
    lbDots.innerHTML = '';
    lbThumbTrack = null;
    lbThumbK = 0;
    lbThumbWinL = lbThumbWinR = -1;          /* 新一组：第一步永远"不播平移"（直接落位） */
    lbThumbLast = -1;                        /* 方向基准也归零：开箱那一步不补入场 */
    lbDots.hidden = list.length <= 1;
    /* ⚠️ 顺序要紧：hidden 必须先摘掉，lbThumbFit 里的 clientWidth 才是真宽度
       （上一组只有 1 张时容器是 hidden 的、clientWidth 是 0 ⇒ 会被算成"一枚都放不下"）。 */
    lbDots.classList.remove('is-window');
    lb.classList.toggle('has-thumbs', !lbDots.hidden);
    lbDots.classList.toggle('is-thumbs', !lbDots.hidden);
    if (!lbDots.hidden) {
      var track = document.createElement('div');
      track.className = 'dy-lb-thumb-track';
      lbDots.appendChild(track);        /* ⚠️ 先入 DOM：lbThumbFit 要读 track 的 columnGap */
      lbThumbTrack = track;
      lbThumbK = lbThumbFit(list.length);
      lbDots.classList.toggle('is-window', list.length > lbThumbK);
      for (var i = 0; i < list.length; i++) {
        var ph = list[i] || {};
        var d = document.createElement('button');
        d.type = 'button';
        d.className = 'dy-lb-thumb' + (i === idx ? ' is-on' : '');
        d.dataset.i = String(i);
        d.setAttribute('aria-label', '第 ' + (i + 1) + ' 张');
        if (ph.thumb || ph.src) {
          var im = document.createElement('img');
          im.src = ph.thumb || ph.src;
          im.alt = '';
          im.loading = 'lazy';
          im.decoding = 'async';
          im.draggable = false;
          d.appendChild(im);
        } else {
          /* 没有图源的条目（历史上动态页用过 emoji 格）—— 预览带里也要有个东西，不能空一格 */
          var sp = document.createElement('span');
          sp.className = 'dy-lb-thumb-emoji';
          sp.textContent = ph.emoji || '\u{1F5BC}';
          d.appendChild(sp);
        }
        track.appendChild(d);
      }
      lbThumbGap(idx);                   /* 先摆好让位，再算 ramp / 对中 */
      lbThumbRamp(idx);
      lbThumbShift();
    }
    /* 说明行：只有"这一组真的带说明 / 日期"才要它（计数那条已随圆点上限一起撤掉） */
    lbCapRows = list.some(function (p) { return !!(p && (p.cap || p.meta)); });
    if (lbCap) lbCap.hidden = !lbCapRows;
    lbShow(idx);

    /* 首图 + 邻近先解码；剩下的延后 —— 9 张以上一次全解码会和首屏抢带宽 */
    var rest = list.slice(Math.max(0, idx - 1), Math.min(list.length, idx + 2));
    setTimeout(function () { for (var k = 0; k < rest.length; k++) lbWarmSrc(rest[k].src); }, 400);

    if (LB_DEBUG) {
      window.__lb = function () {
        var off = function (el) {
          var t = el.style.transform || '';
          var m = /translateX\((-?[\d.]+)px\)/.exec(t);
          return m ? Math.round(parseFloat(m[1]) * 10) / 10 : 0;
        };
        /* 引擎此刻真正渲染出来的 translateX（矩阵里的 tx）—— 与内联目标值是两件事 */
        var cTx = function (el) {
          var m = /matrix\(([^)]+)\)/.exec(getComputedStyle(el).transform);
          return m ? Math.round(parseFloat(m[1].split(',')[4]) * 10) / 10 : 0;
        };
        var dm = lbDims();
        return {
          open: lb.classList.contains('is-open'),
          idx: lbIndex, to: lbTo, n: lbPhotos.length, phase: lbPhase,
          /* 槽位里一共有几个媒体节点（静止 1~3 个：当前 + 存在的邻居） */
          nodes: lbSlots[0].children.length + lbSlots[1].children.length + lbSlots[2].children.length,
          /* 真正【看得见】的槽位数。不变式有两半，别写成一句话：
               · **永远 ≤ 1**（v11「舞台上只有一张图」的硬不变式；v12 起连拖动中
                 也不露邻图，两个邻居槽全程压在 opacity:0）
               · 静止态 = 1
             ⚠️ 出相结束到进相开始之间那一两帧**会短暂为 0** —— 参考站的
             mode="out-in" 本来就是"先淡干净、再淡进来"，台上那一下是空的。
             把它当 bug 去"补一张图"会破坏 out-in 的观感（主人选的就是这一版）。 */
          shown: lbSlots.filter(function (s) {
            return parseFloat(getComputedStyle(s).opacity) > 0.02;
          }).length,
          off: [off(lbSlotPrev), off(lbSlotCur), off(lbSlotNext)],
          /* v12：动画的**声明值**（验收直接读这里，别去采样猜曲线/时长） */
          motion: {
            nudge: LB_NUDGE,
            outMs: lbMs(LB_OUT_MS), inMs: lbMs(LB_IN_MS), gapMs: lbMs(LB_SWAP_GAP),
            outEase: LB_OUT_EASE, inEase: LB_IN_EASE,
            cap: LB_DRAG_CAP, damp: LB_DRAG_DAMP
          },
          /* 当前槽位的实况。⚠️ 两组字段是**两件事**，验收时别混：
               · tx / op / tr = 内联的【目标值】与 transition 声明（"我要求的是什么"）
               · cx / cop     = getComputedStyle 读到的【引擎正在渲染的值】（"现在画到哪"）
             只读内联值会得出"出相一动就是 -32、进相同样一帧到位"的假结论（踩过）。 */
          cur: {
            tx: off(lbSlotCur),
            op: lbSlotCur.style.opacity === '' ? 1 : parseFloat(lbSlotCur.style.opacity),
            tr: lbSlotCur.style.transition || '',
            cx: cTx(lbSlotCur),
            cop: Math.round(parseFloat(getComputedStyle(lbSlotCur).opacity) * 1000) / 1000
          },
          hasP: !!lbSlotPrev.firstChild, hasN: !!lbSlotNext.firstChild,
          /* 一步的步距（邻居间距）。v12 之后**只剩提交阈值**在用（lbCommitDist），
             动画本身与它无关 —— 一步的位移恒为 32px。 */
          stepP: Math.round(dm.p * 10) / 10, stepN: Math.round(dm.n * 10) / 10,
          loaded: lbNode ? (lbNode.tagName === 'IMG' ? (lbNode.naturalWidth > 0 ? 1 : 0) : 2) : -1,
          /* 渲染盒 + 原始像素（验收「照片同尺寸」用）。取元素自身尺寸而不是采样式
             的 getBoundingClientRect —— 后者会被过渡中的 translate 带偏。 */
          box: lbNode ? [
            Math.round(lbNode.getBoundingClientRect().width),
            Math.round(lbNode.getBoundingClientRect().height),
            lbNode.naturalWidth || 0, lbNode.naturalHeight || 0
          ] : null,
        };
      };
    }
  }

  /* 打开一组照片并停在 idx 张。list = [{ src, alt, emoji?, cap?, meta? }]
     —— 页面的责任只有"点哪一张、开哪一组"，引擎这边不认识任何页面选择器。 */
  function open(list, idx) {
    if (!list || !list.length) return;
    idx = idx < 0 ? 0 : (idx > list.length - 1 ? list.length - 1 : idx);
    lbLastFocus = document.activeElement;   /* 关灯箱时还回去（见 lbRestoreFocus）*/
    lbMount(list, idx);
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    /* 锁背后页面的滚动。用哪条路取决于整页跑的是哪套滚动：
       · 原生滚动（2026-09-21 第二百八十七批起**七页全是这条**，页面 <html> 上有
         data-scroll="native"）—— 下一行 body.dy-lb-open 的 overflow:hidden 一个人就够：
         它传播到视口，原生输入（滚轮/触控板/键盘翻页）全挡得住；
       · 站级自研滚轮平滑（只有摘掉该属性的页才存在）—— 它用 window.scrollTo 程序化
         滚动，CSS 拦不住，必须显式调 __wheelLock(true)（下一行的 if 守卫就是给这种页留的）。
       两条都留着：谁把某页的逃生开关摘了，这个锁自动落回唯一还能用的那一层。 */
    document.body.classList.add('dy-lb-open');
    lbNearReset();                         /* 箭头回到"藏着"（见上面那段）*/
    /* v11.6：顺手关掉浏览器自己的"横滑前进 / 后退"手势（macOS 触控板、iOS 边缘侧滑）。
       v11.8 起灯箱内部是**环形**（横滑永远有地方可去），这条更要留着 ——
       否则甩得猛的那一下会整页滑走，看着像灯箱自己关了。 */
    document.documentElement.style.overscrollBehaviorX = 'none';
    if (window.__wheelLock) window.__wheelLock(true);
  }

  /* 关闭时把焦点还给"开灯箱的那个元素"。
     ⚠️ 共享引擎必须自己拿着这件事：相册页原来那套是有的（键盘用户关掉灯箱后不该被丢在
        文档开头），抽引擎时不能顺手丢掉。焦点元素可能已经不在文档里（换页/重渲染），
        所以归还前先问 document.contains。 */
  function lbRestoreFocus() {
    var t = lbLastFocus;
    lbLastFocus = null;
    if (t && document.contains(t) && t.focus) t.focus({ preventScroll: true });
  }

  function closeLb() {
    /* v13：沉浸态 / 全屏 / 方向锁必须一起收 —— 否则从全屏里关掉灯箱，
       页面会停在一个没有灯箱的全屏里，用户只能靠系统手势出来。 */
    if (lbImmersive) lbSetImmersive(false);
    lbLockLandscape(false);
    lbExitFullscreen();
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true');
    lbSettle();
    document.body.classList.remove('dy-lb-open');
    lbNearReset();
    document.documentElement.style.overscrollBehaviorX = '';
    if (window.__wheelLock) window.__wheelLock(false);
    lbRestoreFocus();
  }

  /* 点图打开 / 点空白关闭。图、按钮、圆点都不关。
     ⚠️ 刚拖完的那一下 click 必须丢掉：拖动的 pointerup 可能落在照片外面，
     浏览器会把 click 发给共同祖先（= 舞台），于是"滑一下"会顺手把灯箱关掉。 */
  document.addEventListener('click', function (e) {
    if (!lb.classList.contains('is-open')) return;
    /* ⚠️ 只认**落在灯箱自己里面**的空白。点在外面的元素上不是"点空白关灯箱"，
       而是"点了一张图要开灯箱" —— 相册页的缩图就是这种：它自己的 click 处理器
       在冒泡途中把灯箱开了，事件继续冒到 document 时 is-open 已经为真，
       少了这一条就会"开完立刻被这里关掉"（症状：点图一点反应都没有，
       open 只在几毫秒内为真，控制台干干净净）。
       ⚠️ 顺序是硬的：先判"开着没"，再判"在不在灯箱里"，最后判静音。
       静音（lbClickMute）只该管"这一下 click 是不是拖动的尾巴" ——
       拖完的 click 会落在舞台上，不判静音就会顺手把灯箱关掉（见 lbDragEnd）。 */
    if (!lb.contains(e.target)) return;
    if (performance.now() < lbClickMute) return;
    /* ⚠️ 底部预览带**整条**都算"控件"（`.dy-lb-dots`，不只是缩略图本身）：
       手机上一枚只有 19.5×26px，指尖点偏几像素就会落在带子的空处 ——
       不把它排掉，那一下就会被判成"点了空白"，**顺手把灯箱关掉**（用户看到的是
       "点底部的照片点不了，一点就退出来了"）。现在点空处什么都不发生。 */
    if (e.target.closest && (e.target.closest('.dy-lb-btn') ||
                             e.target.closest('.dy-lb-dots') ||
                             e.target.closest('.dy-lb-thumb') ||
                             e.target.closest('.dy-lb-stage img') ||
                             e.target.closest('.dy-lb-emoji'))) return;
    closeLb();
  });
  /* 方向键翻页（v11.8 起环形：两端继续走就绕回另一端）、ESC 关闭 */
  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLb();
    else if (e.key === 'ArrowLeft') { e.preventDefault(); lbGo(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); lbGo(1); }
  });

  lbPrev.addEventListener('click', function (e) { e.stopPropagation(); lbGo(-1); });
  lbNext.addEventListener('click', function (e) { e.stopPropagation(); lbGo(1); });

  /* ================= v13：横屏观看（手机专用）=================
     主人 2026-09-21：「手机版预览图片时新增可以横屏观看」。
     一层能力、两种实现，按可达性递降 —— 关键是**失败也得有东西可用**：

       ① `requestFullscreen()` + `screen.orientation.lock('landscape')`
          Android Chrome / 三星浏览器可用，进了就是真·横屏全屏。
          ⚠️ 顺序不能反：规范要求文档已经在全屏里，否则 lock() 直接 InvalidStateError。
       ② 两条都不可用时（**iOS Safari 全中**：iPhone 上非 video 元素没有 Fullscreen
          API；Screen Orientation lock 在 Safari 上也从未实现）⇒ 退成**沉浸态**：
          CSS 把圆点条与外壳全让开，画面吃满视口。此时**画面立刻变大就是那一下反馈**。
          用户自己把手机横过来，就落在上面 `orientation: landscape` 那档上，
          拿到横屏那份更大的可用区。

     v13.1（2026-09-21，主人「不要右上角一颗圆钮」）：**触发从按钮换成"点一下照片"**。
       右上角那颗圆钮在屏幕上一个像素都不再出现（`.dy-lb-rotate` 改成 sr-only，
       见 lightbox.css）；#dyLbRotate 元素本身留着 —— 它是 aria-pressed / aria-label
       的出口，也让 lbSetImmersive 不必到处判空。
       ⚠️ 手势只给触屏（`(hover: none) and (pointer: coarse)`，与那颗钮原来的 CSS
          条件一字不差，见 lbIsTouch）。桌面上点照片仍然是"什么都没发生"。
       ⚠️ 挂点是**舞台**（lbStage），不是 document —— 这条不是风格，是判据：
          WebKit 只在「目标本身、或它**非 document 的祖先**持有 click 监听」时才合成
          click（实测：document 级委托 = 不合成，祖先级 = 合成，光有 cursor:pointer 也
          不算）。挂在 document 上 ⇒ 照片上点一下在 Safari 里静默无效。挂在舞台上，
          目标 img 的祖先正是 stage ⇒ 合成。**别"顺手"挪回文档级委托。**
       ⚠️ 只认 `.dy-lb-stage img`：点照片外面的空白仍旧只走"关闭"（document 那份没动）。
       ⚠️ 它必须排在 lbClickMute 判据**之后**：拖一下再抬手会产生一次落在舞台上的
          click，不判静音就会"横滑一张照片、顺手进了横屏"。

     ⚠️ 状态的唯一真相点是 `.dy-lb.is-immersive` 这个 class；lbImmersive 只是它的镜像，
        别让两处各自为政。
     ⚠️ 关闭灯箱必须**一起退出**（见 closeLb）—— 否则从全屏里点关闭，页面会停在
        一个"没有灯箱的全屏"里，用户只能靠系统手势出来。 */
  var lbImmersive = false;

  /* 触屏判据：与原来那颗钮的 CSS 条件一字不差。用 matchMedia 而不是 UA 嗅探 ——
     它跟着设备状态走（插拔鼠标、切平板模式都算），探针也能用 hasTouch 复现。 */
  var lbTouchMQ = window.matchMedia ? window.matchMedia('(hover: none) and (pointer: coarse)') : null;
  function lbIsTouch() { return !!(lbTouchMQ && lbTouchMQ.matches); }

  function lbFullscreen() {
    var el = document.documentElement;
    if (el.requestFullscreen) return el.requestFullscreen();
    if (el.webkitRequestFullscreen) { el.webkitRequestFullscreen(); return Promise.resolve(); }
    return Promise.reject(new Error('no fullscreen api'));
  }
  function lbExitFullscreen() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) return;
    if (document.exitFullscreen) {
      var p = document.exitFullscreen();
      if (p && p.catch) p.catch(function () {});
    } else if (document.webkitExitFullscreen) {
      try { document.webkitExitFullscreen(); } catch (err) {}
    }
  }
  function lbLockLandscape(on) {
    if (!screen.orientation || typeof screen.orientation.lock !== 'function') return;
    try {
      if (on) {
        var p = screen.orientation.lock('landscape');
        if (p && p.catch) p.catch(function () {});
      } else if (screen.orientation.unlock) {
        screen.orientation.unlock();
      }
    } catch (err) {}
  }

  function lbSetImmersive(on) {
    lbImmersive = !!on;
    lb.classList.toggle('is-immersive', lbImmersive);
    /* v13.1：元素在屏幕上已不可见，但 aria 状态照旧维护 —— 它就是给读屏/键盘的那条路。
       判空是为了"哪天某个页面不放这个元素"也能跑（状态机本身不依赖它）。 */
    if (lbRotate) {
      lbRotate.setAttribute('aria-pressed', lbImmersive ? 'true' : 'false');
      lbRotate.setAttribute('aria-label', lbImmersive ? '退出横屏观看' : '横屏观看');
      lbRotate.classList.toggle('is-on', lbImmersive);
    }
    /* 可用区变了 ⇒ 邻居偏移要按新盒宽重摆。静止态看不见它们，但**提交阈值是按步距
       算的**（lbCommitDist）——量到旧步距会让"滑一点点就翻页"。下一帧量才有真实盒宽。 */
    requestAnimationFrame(function () { lbRestFix(); });
  }

  /* 进 / 出横屏观看的**唯一入口**。v13.1 起有两个调用点：点照片（触屏）、
     以及那颗 sr-only 按钮（读屏 / 键盘）。两处必须走同一个函数 —— 状态机只有一份。 */
  function lbToggleRotate() {
    if (lbImmersive) {
      lbSetImmersive(false);
      lbLockLandscape(false);
      lbExitFullscreen();
      return;
    }
    lbSetImmersive(true);
    lbFullscreen()
      .then(function () { lbLockLandscape(true); })
      .catch(function () {});      /* 不可用就留着沉浸态，不弹任何东西 */
  }

  if (lbRotate) {
    lbRotate.addEventListener('click', function (e) {
      e.stopPropagation();
      lbToggleRotate();
    });
  }

  /* v13.1：点照片 = 横屏观看开关。挂点必须是**舞台**（理由见上面那条 ⚠️）。
     ⚠️ 顺序：这条在 document 那份 handler 之前跑（stage 在 document 之前冒泡），
        所以点照片时先在这里 toggle，document 那份只负责"照片不关灯箱"。
     ⚠️ lbClickMute 必须照样判：横滑翻页抬手时浏览器会补一次落在舞台上的 click。 */
  lbStage.addEventListener('click', function (e) {
    if (!lb.classList.contains('is-open')) return;
    if (performance.now() < lbClickMute) return;
    if (!e.target.closest || !e.target.closest('.dy-lb-stage img')) return;
    if (!lbIsTouch()) return;                 /* 桌面：点照片仍旧什么都不发生 */
    lbToggleRotate();
  });

  /* 用户用系统手势退出全屏（Android 返回键 / 手势条）⇒ 沉浸态跟着退，
     否则会留下"全屏没了、圆点条却还藏着"的半截状态。 */
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) {
    document.addEventListener(ev, function () {
      if (!document.fullscreenElement && !document.webkitFullscreenElement && lbImmersive) {
        lbSetImmersive(false);
      }
    });
  });

  /* 转屏 / 改窗口 ⇒ 可用区变了，重摆一次槽位。
     ⚠️ 别改用 orientationchange：iOS 上报的是**物理方向**，与视口尺寸变化不同步。 */
  window.addEventListener('resize', function () {
    if (!lb.classList.contains('is-open')) return;
    /* 宽度变了，说明行的折行数可能也跟着变（宽了就不折了）⇒ 先重量它，再摆槽位。
       ⚠️ 顺序不能反：lbRestFix → lbRest 是按可用区算的，而可用区里有说明行的高度。 */
    lbMeasureCap();
    lbRestFix();
    /* 视口宽变了 ⇒ 预览带要重新量（窄屏能放的枚数会变）再重新对中（见「底部预览带」） */
    if (lbThumbTrack) {
      lbThumbK = lbThumbFit(lbPhotos.length);
      lbDots.classList.toggle('is-window', lbPhotos.length > lbThumbK);
      lbThumbGap(lbIndex);
      lbThumbRamp(lbIndex);
      lbThumbShift();
    }
  });
  /* 底部预览带：点哪张走哪张。v11.7 起跨多张也只播**一段**（目标先摆进屏外邻居槽再滑一步，
     见 lbGoSlide）—— 逐段走 = N×280ms，而"跳 5 张"和"翻 1 张"本来就该是同一种观感。
     ⚠️ 选择器必须跟着"元素换名"一起改：第二百九十六批把圆点换成 `.dy-lb-thumb` 时，
        这一条和下面"点空白关灯箱"的白名单都漏了 ⇒ 点缩略图**没反应**（closest 拿不到东西，
        事件继续冒到 document，还被白名单判成"点了空白"⇒ **顺手把灯箱关掉**）。
        两个探针都没抓到，因为验收全都是"点 .album-shot 开灯箱"，没点过缩略图本身。 */
  lbDots.addEventListener('click', function (e) {
    var d = e.target.closest ? e.target.closest('.dy-lb-thumb') : null;
    if (!d) return;
    e.stopPropagation();
    var i = parseInt(d.dataset.i, 10);
    if (isNaN(i) || i === lbIndex) return;
    lbGoSlide(i);
  });

  /* ---------------------------------------------------------------- 对外接口 */
  window.RMLightbox = {
    open: open,
    close: closeLb,
    isOpen: function () { return lb.classList.contains('is-open'); },
    mount: lbMount
  };
})();
