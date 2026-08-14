# Homepage Blueprint v6.4 · 时雨时猫

> **核心变化**：主页 = nav + Hero + **设计区(雨/字/色/动/链 · 涟漪特效 · 大方版)** + **5 帧猫娘分镜**(无 footer / 无 playground)。
> - Hero:头像 + 标题(主页入口)
> - **设计区(新 · 大方版)**:整段 100vh + 5 巨字横排(雨/字/色/动/链) + 60-70vh 大主图 + **WebGL 涟漪特效**(第 2 wow 时刻)
> - 5 帧:猫娘 mini 故事(落/眸/笑/歌/触),4 项互动融入每帧角落
> **视觉策略**：**5 帧全 AI 图为主体 + CSS 撑包装**(巨字标题/氛围层/动效/scroll-snap 容器仍用 CSS)——**站内图片资源共 6 张**(1 头像 + 5 帧,各 4 尺寸 webp)+ 设计区主图 1 张(用户 AI 出,5 尺寸)
> **5 帧联动**：**all-in 5 项**(① 猫娘姿态连贯 · ② 跨 slide 状态回响 · ③ 共享背景层 · ④ 巨字字符级转场 · ⑤ 进度累积)
> **设计区涟漪**:**WebGL ogl + vanilla JS 重写**(从 reactbits.dev RippleDistortion),**电脑端 hover+click + 移动端 tap**,行为一致
> **状态**:23 项已定 / 3 项待定 · 5 项页面级 + 4 项融入 5 帧 · 5 项联动 · 1 项涟漪(WebGL) · JS 增量 ~30KB(涟漪组件 ~15KB + ogl CDN ~30KB)
> **范围**:主页 index.html + 4 个分页 + 全局设计系统 + 涟漪组件

---

## 📑 目录

1. [设计意图](#1-设计意图)
2. [整体结构（主页 + 4 个分页）](#2-整体结构主页--4-个分页)
3. [头像方案](#3-头像方案)
4. [Hero 设计（avatar 在右方）](#4-hero-设计avatar-在右方)
5. [滑动展示（5 帧猫娘 · 互动融入 · 5 项联动）](#5-滑动展示5-帧猫娘--互动融入--5-项联动)
6. [互动玩法（5 页面级 + 4 融入）](#6-互动玩法5-页面级--4-融入)
7. [设计系统](#7-设计系统)
8. [实施步骤](#8-实施步骤)
9. [决策清单](#9-决策清单)
10. [验收清单](#10-验收清单)
11. [可选增强](#11-可选增强)
12. [附录 A. 完整代码](#附录-a-完整代码)

---

## 1. 设计意图

> **一只叫 rain.meow 的猫娘站在 Hero 右方，5 张全宽 slide 横向 snap-scroll 讲述猫娘的 mini 故事（落/眸/笑/歌/触），每张自带 1 个核心互动。访客在滚动的过程中顺便玩到了所有互动——slides 本身就是 demo。**

**主页使命（变了）**
- ~~之前：信息密度大、4 段式、像个人简历~~
- **现在：极简 + 互动 showcase，主页是橱窗不是简历**

**继承**（沿用 V1，不动）
- 暖白底 / 蓝色单一强调色 / IBM Plex 字体族 / §-style 编辑风 / 玻璃质感 nav

**新增**（V6.4）
- 主页结构极简化(**Hero + 设计区(雨/字/色/动/链)+ 5 帧猫娘分镜**,**无 footer · 无 playground**)
- avatar 改到 Hero **右方**(V5 是左方)
- 5 项页面级互动 + **4 项互动融入 5 帧猫娘**(落/眸/笑/歌/触)
- 4 个独立 page(关于/项目/联系/动态)
- 5 帧**全 AI 图为主体 + CSS 撑包装**(巨字 / 容器 / 氛围 / 动效由 CSS 负责,AI 图负责"感人")
- **设计区(新)**:展示 5 个设计维度(雨/字/色/动/链)+ **WebGL 涟漪特效**(ogl + vanilla,源自 reactbits.dev)

---

## 2. 整体结构（主页 + 4 个分页）

### 2.1 主页(`index.html`)— 3 段:Hero + 设计区 + 滑动展示(**无 footer · 无 playground**)

```
┌──────────────────────────────────────────────────┐
│  [rain.meow]  项目  关于  动态  ☾ 🌍 ☰          │  ← nav(3 项)
├──────────────────────────────────────────────────┤
│ [🌧️ 细雨 canvas]                                  │
│                                                   │
│   时雨时猫                      ╭────────╮        │
│   从零开始学编程...                │  ◉ ◉  │        │
│   (打字机 §6.2)                  │   ω   │        │  ← Hero
│   ─── 📍 上海 ───                ╰────────╯        │
│                                                   │
├──────────────────────────────────────────────────┤
│  ── 设计区(雨/字/色/动/链 · WebGL 涟漪)──       │
│   5 个设计维度,鼠标 hover/click 触发涟漪扭曲      │  ← 设计区(新)
│   灰度 + 染色 + 光环 + 多重波纹                    │
├──────────────────────────────────────────────────┤
│  ── 滑动展示(5 张横向 snap · §4.5) ──         │
│  [N°01 落] [N°02 眸] [N°03 笑] [N°04 歌] [N°05 触] │
│   (横向 snap 滚动,5 个 viewport)                  │
│   **每张 slide 内嵌 1 个核心互动**                │
│                                                   │
└──────────────────────────────────────────────────┘
                                                  ↑ 无 footer
```

**整页 ~7-8 个 viewport 高度**(桌面),手机 ~9-10 个 viewport。
**没有 footer、没有 playground**——互动全部融入 5 张 slides,涟漪在设计区。

### 2.2 4 个分页

| 文件 | 内容 | 状态 |
|------|------|------|
| `pages/projects.html` | 编程项目（my-first-repo / 个人主页） + 设计作品 | ⏳ 新建 |
| `pages/about.html` | 关于我（bio + 头像 + 故事 + 技能标签 + 联系方式）| ⏳ 新建 |
| `pages/contact.html` | 联系（**可选** — 联系 widget 已在主页 §5.5）| ⏳ 可省略 |
| `pages/now.html` | "动态"（最近在做什么，类 Derek Sivers /nownownow）| ⏳ 新建（可选）|

### 2.3 导航更新

**对比 V5**：从 4 个链接（项目/动态/照片/关于）精简到 3 个；"照片"和"联系"合入 about；"联系"放 playground §5.5；"动态"变成 now page（可选）。

### 2.4 设计区(新 · 主页第 2 段 · 雨/字/色/动/链)

> 详细设计见 §6.12。这里只讲定位。

**位置**:Hero 之后、5 帧之前。整页 3 段(nav + Hero + 设计区 + 5 帧 + 无 footer)。

**目的**:
- 视觉上:Hero 之后、5 帧之前的"过渡 + 预览",避免 Hero 直接跳 5 帧太突兀
- 功能上:展示 design system 的 5 个维度(雨/字/色/动/链),作为"主页 1 段就讲清楚设计能力"的载体
- 特效上:**作为涟漪特效的舞台** — WebGL 持续渲染带来"wow 时刻",提升主页整体视觉冲击

**5 个维度**(旧 V5/V6.0 命名,从 5 帧叙事移到此处):
- **雨** = 氛围(细雨/水滴,与 §6.1 细雨 canvas 呼应)
- **字** = 排版(IBM Plex 字体族 + 巨字 200px)
- **色** = 色彩(6 主题色,与 §6.8 主题色切换呼应)
- **动** = 动效(CSS scroll-driven + view-transition)
- **链** = 连接(跨 slide 状态回响 + progress 累积)

**待决事项**(见 §6.12.6):
- [ ] 设计区结构方案 A / B / C(见 §6.12.2)
- [ ] 主图来源(用户自拍 / 5 帧之一 / 用户设计作品 / AI 现出 1 张 / CSS 渐变占位)
- [ ] 移动端是否启用涟漪

---

## 3. 头像方案

### 3.1 选型与规格（不变）

| 项 | 决定 |
|----|------|
| 方案 | A · 插画猫角色（kawaii 二次元猫娘）|
| 视觉地位 | **主角** |
| 比例 | 1:1 |
| 基础分辨率 | ≥ 1024×1024 |
| 产物 | `avatar-{320,480,720,1024}.webp` |
| 位置 | `/assets/images/avatar.webp` |
| 形状 | **圆形**（`border-radius: 50%`）|

### 3.2 AI 提示词（不变 · 见 §1.1）

保留 V5 的 SD prompt，不重复。

---

## 4. Hero 设计（avatar 在右方）

### 4.1 布局

   时雨时猫                          ╭────────╮
   从零开始学编程， 弄懂一点就记一点。   │  ◉ ◉  │
   ─── 📍 上海 · 2026.08.01 ───        │   ω   │
                                      ╰────────╯

> avatar 改在 Hero **右方**（V5 是左方），文字在左。**圆形头像**（用户已确认）。

**桌面**：左文（60%）/ 右 avatar（40%），垂直居中对齐。
**移动**：单列堆叠，avatar 在文字**上方**（保留原计划的优先级）。

### 4.2 关键样式

| 属性 | 值 |
|------|-----|
| 尺寸 | `clamp(160px, 20vw, 240px)` |
| 形状 | `border-radius: 50%` |
| 边框 | `1px solid var(--color-rule)` |
| 外环 | `0 0 0 6px rgba(var(--color-accent-rgb), 0.10)` |
| 阴影 | `0 8px 32px rgba(0,0,0,0.08)` |
| 视差速度 | `--parallax-avatar: 0.3` |

**标题让位**：`font-size: clamp(48px, 6.5vw, 96px)`（V5 同款）。

### 4.3 标题 / 副文案

- 标题：`时雨时猫`（IBM Plex Serif 斜体）
- 副文案：`从零开始学编程， 弄懂一点就记一点。`（**打字机效果** §6.2）
- 日期：`─── 📍 上海 · 2026.08.01 ───`

---
## 4.5 滑动展示 / **5 帧猫娘分镜**（每帧 1 个核心互动）

> **这是 Hero 之后的"哇哦时刻"**。5 张全宽 slides 横向 snap-scroll，每张是猫娘故事里的 1 帧动作（落/眸/笑/歌/触），自带 1 个核心互动。访客在滚动的过程中**顺便玩到了所有互动**。
> **5 帧合起来是猫娘的 mini 故事**：雨落静心 → 抬眸相视 → 笑送云糖 → 哼歌漫步 → 伸手想触。**取代旧的抽象字（雨/字/色/动/链）——太尬**。

### 4.5.0 命名来源

旧的 5 字（**雨/字/色/动/链**）是抽象设计概念，太"硬"。换成**二次元动词语** + **情感副文案**：

| # | 字 | 副文案 | 心理动作 | 视觉元素 |
|---|----|--------|---------|----------|
| 01 | **落** | 雨滴落下的瞬间，心里也跟着静了 | 静心 / 沉淀 | 透明伞 + 加密雨（AI 图·半身）|
| 02 | **眸** | 第一次抬眼看你，你也在看吗 | 凝视 / 心动 | AI 图·蓝眸极特写 |
| 03 | **笑** | 想把今天的云都变成棉花糖送你 | 温暖 / 给予 | AI 图·捧云微笑 + 6 大色块 |
| 04 | **歌** | 走在路上，嘴里哼着没名字的调 | 自由 / 哼唱 | AI 图·哼歌侧脸 + CSS 跳动音符 |
| 05 | **触** | 伸出手，想碰一下，又缩回来 | 渴望 / 犹豫 | AI 图·伸手向 viewer |

### 4.5.1 整体布局

```
┌────────────────────────────────────────────────────────────┐
│ N° 01 / 05                                  ● ● ● ● ●    │  ← 指示器
├────────────────────────────────────────────────────────────┤
│                                                            │
│   N° 01                                                    │
│                                                            │
│   落                                                       │
│                                                            │
│   「雨滴落下的瞬间，心里也跟着静了」                        │
│                                                            │
│   🕐 14:23:08 · 📍 上海 · ⌨️ 写 C++ 中        [背景：透明伞 + 加密雨] │
│   ↑ 现在 widget（融入 slide 01 角落）                      │
│                                                            │
├────────────────────────────────────────────────────────────┤
│   N° 02            眸              ...                      │
│   「第一次抬眼看你，你也在看吗」                            │
│   [背景：CSS 蓝眸特写——同心圆 + 高光]                     │
│   --color-accent: #2563eb  --hero-title: clamp(...)        │
│   ↑ tokens 显示（融入 slide 02 角落）                       │
├────────────────────────────────────────────────────────────┤
│   N° 03            笑              ...                      │
│   「想把今天的云都变成棉花糖送你」                          │
│   [大色块：点击 6 色之一 → 全站实时换主题色 ⭐]              │
│   ↑ 主题色 playground 搬这里                              │
├────────────────────────────────────────────────────────────┤
│   N° 04            歌              ...                      │
│   「走在路上，嘴里哼着没名字的调」                          │
│   [5 个 mini demo：点击触发 细雨/涟漪/打字机/视差/进度条]   │
│   ↑ 动效 playground 搬这里                                 │
├────────────────────────────────────────────────────────────┤
│   N° 05            触              ...                      │
│   「伸出手，想碰一下，又缩回来」                            │
│   [3 大圆点：GitHub / Email / Twitter]                      │
│   [Email 点击复制 ✓]                                        │
│   ↑ 联系 playground 搬这里                                  │
└────────────────────────────────────────────────────────────┘
### 4.5.2 5 帧猫娘的内容矩阵(每张 1 个核心互动)

> 关键:**每张 slide 角落的"小互动"不抢戏**——巨字始终是视觉主角,小互动是"彩蛋"。

| # | 字 | 副文案 | 内嵌互动 | 视觉处理(AI 图主体 + CSS 包装)|
|---|----|--------|----------|----------|
| 01 | **落** | 雨滴落下的瞬间,心里也跟着静了 | 🕐 现在 widget | AI 图·透明伞半身(CSS 加 200 滴加密雨氛围)|
| 02 | **眸** | 第一次抬眼看你,你也在看吗 | 📐 tokens | AI 图·蓝眸极特写(CSS 加 mix-blend-mode 让瞳色随主题变)|
| 03 | **笑** | 想把今天的云都变成棉花糖送你 | 🎨 主题色切换 ⭐ | AI 图·捧云微笑 + CSS 6 大色块 + 弧形笑颜 |
| 04 | **歌** | 走在路上,嘴里哼着没名字的调 | ✨ 5 项动效 mini demo | AI 图·哼歌侧脸 + CSS 跳动音符 ♪♫♩ |
| 05 | **触** | 伸出手,想碰一下,又缩回来 | 📮 联系 | AI 图·伸手向 viewer + CSS 联系圆点 |

---

### 4.5.3 5 帧 AI 图嵌入方式(**图片主体 + CSS 包装**)

**结构原则**:5 帧 AI 图负责"感人",CSS 负责"高级"。图片在 slide 视觉层(右下/左下角,占 40% 区域),巨字在前景中央(200px,占 50% 区域)。

**HTML 通用结构**(每张 slide 都是这模式,只换 data-slide 索引和图片路径):
- `<article class="slide" data-slide="N">` 容器
  - `<span class="slide-num">N° 0N</span>` 编号
  - `<h2 class="slide-title">字</h2>` 巨字(200px,前景)
  - `<p class="slide-sub">「副文案」</p>` 副文案
  - `<picture class="slide-visual">` 4 尺寸 webp 适配
  - `<aside class="slide-wiget">` 角落互动

**CSS 包装**:
- 巨字 + 副文案 `z-index: 1` 在最上层
- AI 图 `z-index: 0`,`mix-blend-mode: multiply` 让浅蓝底融进 slide 背景
- `filter: drop-shadow(0 20px 40px rgba(15, 23, 42, 0.08))` 轻盈悬浮感
- 5 帧位置:01 右下 / 02 居中(scale 1.2)/ 03 右下居中 / 04 左下 / 05 右下
- 移动端:图占 75vw,opacity 0.3 当背景;02 眸特写仍 opacity 0.7 清晰

**02 眸特别处理**(联动 ② 主题色跟随):
- 主题色变蓝/紫/粉时,JS 给图加 `.eye-accent` class
- CSS `filter: hue-rotate(var(--accent-hue, 0deg)) saturate(1.1)` 模拟瞳孔换色
- 0.4s ease 过渡,与主题色切换同步

**04 歌 CSS 音符**(替代 AI 画):
- 5 个 `<span class="note">♪♫♩♪♫</span>` 浮动在 slide 右上
- 错峰跳 3s 周期,5 个 0.4s 间隔
- `color: var(--color-accent)` 自动跟随主题色
- 触发 mini demo 时加 `.boost` class,加速到 0.6s

**03 笑 CSS 弧形笑颜**(背景氛围,弱化):
- 简单 SVG `<path d="M 20 20 Q 100 90 180 20">` 弧线
- opacity 0.12,不抢 AI 图戏
- 在 AI 图周围,不做主体

> **完整实现代码见 `code-snippets.md` § #N**

---

### 4.5.4 通用技术(横向 snap + 入场)

**滑动容器**:
- `.slides` 横向 flex 容器,`overflow-x: auto`
- `scroll-snap-type: x mandatory`,每张 100% 宽强制对齐
- `scroll-snap-stop: always` 确保一次只跳一张
- 隐藏滚动条(`scrollbar-width: none` + webkit)

**入场动画**(CSS 原生 scroll-driven):
- 用 `animation-timeline: view(inline)` 监听 slide 进入视口
- `.slide-num / .slide-title / .slide-sub / .slide-visual / .slide-wiget` 错峰 fade-up
- 延迟 0.05s → 0.15s → 0.25s → 0.35s
- `from: opacity 0, translateY(40px) scale(0.96)`
- 不支持 `animation-timeline: view()` 时降级为立即显示

**降级**(`@supports`):
- 不支持 `animation-timeline: view()` → 入场立即显示
- `prefers-reduced-motion: reduce` → 关闭所有入场 + 关闭 wheel→horizontal

> **完整实现代码见 `code-snippets.md` § #N**

---

### 4.5.5 5 帧的 4 个"萌点"细节(**AI 图 + CSS 混合**)

1. **副文案是诗**:每张 slide 的副文案不是设计概念,是**有情感的句子**("心里也跟着静了"/"你也在看吗")
2. **AI 蓝眸极特写**(02 眸):AI 图占 slide 居中 60% 区域,scale 1.2,联动 ② 主题色变 → 瞳色用 `hue-rotate` 跟随
3. **弧形笑颜**(03 笑):AI 捧云图周围一条淡淡 SVG 弧线(opacity 0.12,不抢图)
4. **跳动音符**(04 歌):5 个 ♪♫♩ 用 CSS 错峰浮动(联动 ② 主题色变 → 音符色变)
5. **犹豫虚线**(05 触):AI 伸手图 + 腕部 SVG 虚线 = "想碰又缩回来"(CSS 后期补)

---

### 4.5.6 视觉冲击的关键

- **巨字**:`clamp(80px, 14vw, 200px)` —— **必须大**
- **AI 图 + 巨字双主角**:图占 40-50% 区域(z-index 0),巨字占 50-60% 区域(z-index 1)
- **mix-blend-mode: multiply**:让 AI 图的浅蓝底融进 slide 背景,看起来更整体
- **drop-shadow 微滤镜**:`filter: drop-shadow(0 20px 40px rgba(15, 23, 42, 0.08))` 让图有轻盈悬浮感
- **配色对比**:slide 之间的氛围色要有差异(01 冷色雨 / 02 蓝眸 / 03 彩色块 / 04 暖黄 / 05 主题色)
- **节奏**:每张 100vh,**5 张 = 5 个 viewport**,不能短

---

### 4.5.7 无障碍

- `prefers-reduced-motion`:关闭所有入场动画 + 关闭 wheel→horizontal
- 键盘左右键仍可用
- 每张 slide 有 `aria-label="N° 01 / 05:落(雨滴落下的瞬间……)"`
- AI 图全部 `aria-hidden="true"`(装饰用,不被读屏)
- CSS 视觉元素全部 `aria-hidden="true"`
- 角落 widgets 标记 `aria-live="polite"`

---

### 4.5.8 5 帧联动设计(**all-in 5 项** · 总工时 8-12h)

> **核心原则**:5 帧不是 5 个孤岛,而是 1 个连续体验。下面 5 项联动让访客"感觉在读 1 句话,不是看 5 张图"。

#### 联动 ① 猫娘姿态连贯(叙事联动 · 出图时控 · 0h 额外)

**目的**:5 张 AI 图的姿态连成一条动作弧,让访客感觉在看"5 帧 GIF 关键帧"而不是 5 张独立海报。

**姿态弧**:
```
01 落     →  02 眸     →  03 笑     →  04 歌     →  05 触
低头撑伞    抬眼对视     笑送云糖     闭眼哼歌     伸手向前
head↓       eye gaze↑    mouth↑       head↘       arm→
eyes↓       看我          squint       half-closed  伸出
```

**出图约束**(在 5 段 prompt 里都加这段):
```
character consistency: same girl across all 5 frames,
upper body stays in same position relative to camera,
only the head, expression, and arm pose changes between frames,
keep same lighting direction, same white sailor uniform, same blue ribbon
```

**效果**:左右滑动时,5 帧像"猫娘转过头来看你,笑了,哼歌,伸手"的连续动作。

#### 联动 ② 跨 slide 状态回响(状态联动 · 2-3h)

**目的**:用户碰一下这边,那边有反应 —— 5 帧是"活着的整体"。

| 触发 | 回响 |
|------|------|
| Slide 03 选主题色(蓝/紫/粉/红/橙/青)| Slide 02 眸的瞳孔色 0.4s 渐变跟随;Slide 04 歌的音符色 0.4s 渐变跟随 |
| Slide 04 触发音符动效 | Slide 01 落的雨滴密度 +30%, 节奏 +20% 同步 |
| Slide 01 widget 时间跳秒 | 全场所有 5 帧的"现在时刻"同步显示(在角落持续可见)|
| Slide 02 tokens 点击复制 | 该 token 短暂高亮("已复制 ✓"反馈 1.5s)|
| Slide 05 联系圆点 hover | 圆点放大 + 手指微动(avatar 微表情)|

**实现**:JS 监听 localStorage `accent` 变化,广播 CustomEvent;CSS 用 `var(--accent)` 接收。

#### 联动 ③ 共享背景层(视觉联动 · 1-2h)

**目的**:5 帧有根贯穿全场的"线",滚动时缓慢视差。

**结构**:1 个 `<canvas id="bg-particles">` 固定定位(z-index 0),与 5 帧独立。粒子有 `phase` 属性(0-1),随 `animation-timeline: scroll()` 变化:
- `phase 0.0-0.2` → 雨丝(01 落)
- `phase 0.2-0.4` → 光斑(02 眸)
- `phase 0.4-0.6` → 云朵(03 笑)
- `phase 0.6-0.8` → 音符(04 歌)
- `phase 0.8-1.0` → 指尖光(05 触)

滚动时背景层缓慢左移 0.3x,形态从雨丝渐变到光斑再到音符。1 个 canvas 跑 1 个粒子系统,统一控制。

#### 联动 ④ 巨字字符级转场(视觉冲击最强 · 4-6h)

**目的**:slide 切换时,巨字"落/眸/笑/歌/触"不是瞬间换,而是**字符级变形动画** —— 哇哦时刻。

**转场序列**:
```
落 → 眸    雨滴"落"在眼睛上,变成眸里的光斑
眸 → 笑    眼睛"笑"成弧形(iris → mouth-arc)
笑 → 歌    笑颜"歌"成音符(mouth-arc → music note)
歌 → 触    音符"触"成手指(music note → finger)
```

**实现**:用 SVG `clip-path` + CSS `clip-path: path()` 做字符级动画。每个字 4 帧关键帧:`from 形态 → 过渡 30% → 过渡 70% → to 形态`。5 张 slide 都有同样的 `<span class="giant">字</span>` 容器,滚动时通过 `view-transition` API 或自写 JS 切换 path。

**性能与降级**:
- `will-change: clip-path` 提示
- `transform: translateZ(0)` 启用 GPU
- 移动端检测 `prefers-reduced-motion`,降级为 opacity 渐变
- 不支持 `view-transition` → fallback 到 opacity 渐变

#### 联动 ⑤ 进度累积(轻联动 · 30min)

**目的**:用户有"完成度"动力,愿意看完 5 张。

**视觉**:
- 顶部 nav 下方一条**细进度条**(2px 高),`width: var(--progress)`,值 0-100%
- 进度 = `已访问 slide 数 / 5 × 100%`
- 每访问一张,该格的 dot 从灰变实心 + 标号高亮
- 5/5 时,整条进度条轻微"完成"动效(亮度 +20% 持续 0.6s 后回落),触发一次性微动效

**实现**:`IntersectionObserver` 监听 5 个 `.slide` 进入,标记已访问,更新 CSS variable 和 dots class。

#### 联动效果优先级

| 联动 | 视觉冲击 | 性能开销 | 实现难度 | 总评 |
|------|----------|----------|----------|------|
| ① 姿态连贯 | ⭐⭐⭐⭐ | 0 | prompt 控制 | 必做(0 成本) |
| ⑤ 进度累积 | ⭐⭐⭐ | <1KB JS | 低 | 必做(30min) |
| ② 状态回响 | ⭐⭐⭐⭐ | <1KB JS | 中 | 推荐(2-3h) |
| ③ 共享背景 | ⭐⭐⭐ | ~3KB JS | 中 | 推荐(1-2h) |
| ④ 巨字转场 | ⭐⭐⭐⭐⭐ | ~4KB JS | 高 | 高级(4-6h) |

**总工时估算**:① 0h + ② 2-3h + ③ 1-2h + ④ 4-6h + ⑤ 0.5h = **8-12h**

---

### 4.5.9 5 帧 AI 出图指南(引用独立文件)

> **5 帧 AI 图的 prompt 不在本蓝图里详细写**,独立成文件:
>
> 📄 **`/.blueprint/5-frame-prompts.md`**(v2,11.8KB / 244 行)
>
> **包含内容**:
> - 🔒 通用规则(角色前缀 / 一致性约束 / Negative / 背景 / 工具备注)
> - 🎬 5 帧完整 Prompt(每帧含 prompt / SD 参数 / MJ 参数 / 追加 Negative / 抠图注意)
> - 🎵 联动 ④ CSS 音符替代方案(Q1 决策)
> - 🛠 出图 → 抠图 → 入站 全流程(5 步)
> - ✅ 质量自检 Checklist(9 条)
> - 📋 v1 → v2 变更摘要(8 个问题修复 + Q1Q2 拍板)
>
> **何时引用**:
> - 用户开始出图时 → 直接打开该文件复制 prompt
> - 实施 §8 步骤 #2(出 5 帧 AI 图)时 → 主人按文件执行

---

## 6. 互动玩法(5 页面级 + 4 融入 slide)

> 主页 = **2 段**(Hero + 5 slides)。所有互动要么自动跑(5 项页面级),要么藏在 slide 角落(4 项融入 slide)。
> **总数 9 项**(V6.1 是 11 项,删了 playground 后减 2)。

### 6.0 总览

| # | 名称 | 分类 | 位置 | 技术栈 | JS 量 |
|---|------|------|------|--------|-------|
| 6.1 | 🌧️ 细雨 canvas | 页面级 | 全站 | Canvas + rAF | ~80 行 |
| 6.2 | ⌨️ 打字机 | 页面级 | Hero 副文案 | setTimeout | ~20 行 |
| 6.3 | 💧 点击涟漪 | 页面级 | 全站 | CSS 动画 | ~10 行 |
| 6.4 | 🎯 Hero 视差 | 页面级 | Hero | **CSS** `animation-timeline: scroll()` | **0** |
| 6.5 | 📊 阅读进度条 | 页面级 | nav 下 | **CSS** `animation-timeline: scroll()` | **0** |
| 6.6 | 🕐 现在 widget | 融入 slide | Slide 01 角落 | rAF + setInterval | ~15 行 |
| 6.7 | 📐 tokens 显示 | 融入 slide | Slide 02 角落 | Clipboard API | ~10 行 |
| 6.8 | 🎨 主题色切换 | 融入 slide | **Slide 03 主场** | localStorage + 颜色过渡 | ~15 行 |
| 6.9 | ✨ 5 项动效 demo | 融入 slide | **Slide 04 主场** | 各 demo 复用 6.1-6.5 | ~30 行 |
| 6.11 | 📮 联系 | 融入 slide | Slide 05 | Clipboard API | ~10 行 |

**JS 总增量**:~180 行 ≈ ~6KB(细雨是大头)。
**统一无障碍**:全部 9 项检测 `prefers-reduced-motion`。

### 6.1 🌧️ 细雨 canvas(全站)

**位置**:`<canvas id="rain">` 固定定位,z-index 0,pointer-events none。
**行为**:浅 80 滴 / 深 150 滴,根据背景亮度自适应。`requestAnimationFrame` 循环下落,落到 100vh 重置。
**触发**:页面加载自动跑。
**降级**:`prefers-reduced-motion` → 关闭。

### 6.2 ⌨️ 打字机(Hero 副文案)

**位置**:Hero `.tagline` 元素。
**行为**:`setTimeout` 逐字显示"从零开始学编程, 弄懂一点就记一点。",`--typewriter-speed: 60ms`。完成后停顿 2s,删除再打(可选)。
**触发**:页面加载自动跑。
**降级**:`prefers-reduced-motion` → 立即显示完整文本。

### 6.3 💧 点击涟漪(全站)

**位置**:`<body>` 全局 click 监听。
**行为**:点击位置生成一个 `<span class="ripple">`,`@keyframes` 从 0 扩散到 200px 透明,300ms 后销毁。
**触发**:任何点击(链接 / 按钮 / 空白)。
**降级**:`prefers-reduced-motion` → 关闭。

### 6.4 🎯 Hero 视差(CSS 原生)

**位置**:Hero 内 `.avatar` / `.title` / `.tagline` 元素。
**行为**:不同 `animation-timeline: scroll()` 速度 —— avatar 0.3 / title 0.5 / tagline 0.7,滚动时 Y 轴位移。
**降级**:不支持 `animation-timeline` → 元素保持原位(0 JS 开销)。

### 6.5 📊 阅读进度条(CSS 原生)

**位置**:nav 下方一条 2px 进度条。
**行为**:`animation-timeline: scroll()` 配合 `scaleX()`,从 0 到 1 反映整个文档的滚动进度。
**降级**:不支持 → 静态显示。

### 6.6 🕐 现在 widget(**融入 Slide 01 角落**)

**位置**:`<aside class="slide-wiget now-widget" aria-live="polite">` 在 Slide 01 左下角。
**内容**:`时间 HH:MM:SS · 📍 上海 · ⌨️ 写 C++ 中`(可配置)。
**行为**:`setInterval` 每秒更新时间。联动 ②:时间跳秒时全场 5 帧的"现在时刻"同步显示(其他 slide 也在角落持续显示当前时间)。
**降级**:`prefers-reduced-motion` → 仍显示但不闪烁。

### 6.7 📐 tokens 显示(**融入 Slide 02 角落**)

**位置**:`<aside class="slide-wiget tokens-list">` 在 Slide 02 右上。
**内容**:显示 3-5 个关键 CSS tokens(`--color-accent`、`--hero-title-size`、`--typewriter-speed` 等),带 copy 按钮。
**行为**:点击 token → `navigator.clipboard.writeText()`,反馈"已复制 ✓"1.5s。联动 ②:点击时该 token 短暂高亮。
**降级**:不支持 `clipboard.writeText` → fallback `document.execCommand('copy')`。

### 6.8 🎨 主题色切换(**融入 Slide 03 主场**)

**位置**:`<div class="accent-picker">` 6 个大色块 2×3 排满 Slide 03。
**内容**:`蓝 #2563eb / 紫 #7c3aed / 粉 #ec4899 / 红 #ef4444 / 橙 #f97316 / 青 #06b6d4`。
**行为**:点击 → JS 改 `document.documentElement.style.setProperty('--color-accent', value)`,平滑过渡 600ms。同时存 `localStorage.accent`。
**联动 ②**:主题色变 → 02 眸的瞳色 hue-rotate + 04 歌的音符色自动跟随。
**降级**:不支持 `localStorage` → 主题色仅当前会话有效。

### 6.9 ✨ 5 项动效 mini demo(**融入 Slide 04 主场**)

**位置**:`<div class="mini-demos">` 5 个 mini 卡 1×5 横排底部。
**内容**:5 个 100×100 卡片,每张一个微互动:🌧️ 细雨(临时开 5s)/ 💧 涟漪(局部)/ ⌨️ 打字机(临时 slogan)/ 🎯 视差(临时加速)/ 📊 进度条(临时高亮)。
**行为**:点击 → 临时触发对应动效 3s,期间对应原互动临时增强。
**联动 ②**:触发音符动效时 Slide 01 雨滴节奏同步。
**降级**:`prefers-reduced-motion` → 全部关闭。

### 6.10 🎬 滑动展示容器(见 §4.5 详细设计 + 附录 A.9)

**位置**:`.slides-section` 容器。
**行为**:横向 scroll-snap + wheel→horizontal 转横向 + IO 同步指示器。详细见 §4.5。

### 6.11 📮 联系(**融入 Slide 05**)

**位置**:3 大圆点水平排开,Slide 05 中央。
**内容**:GitHub / Email / Twitter(可选)。
**行为**:GitHub → `target="_blank"` 新页打开;Email → `navigator.clipboard.writeText(email)` + "已复制 ✓";Twitter 同 GitHub。hover 时圆点放大 + 手指微动。
**降级**:`prefers-reduced-motion` → 关闭 hover 动效。

### 6.12 🌊 设计区(雨/字/色/动/链)+ 涟漪特效(新 · WebGL · 主页第 2 段)

> **位置**:Hero 下面、5 帧上面,1 段独立全宽(80vh,介于 100vh Hero 和 100vh × 5 帧之间)。**主页的第 2 段**。
> **目的**:Hero 之后、5 帧之前的"过渡 + 预览",展示 design system 的 5 个维度,同时**作为涟漪特效的舞台**(WebGL 视觉冲击)。
> **互动定位**:**第 10 项互动**(原 9 项 + 涟漪),独立于其他 9 项,作用域只在设计区。

#### 6.12.1 5 个设计维度的含义

> **命名来源**:旧 V5/V6.0 的抽象字(雨/字/色/动/链),从 5 帧叙事移到设计区(因为 5 帧改用 二次元动词语"落/眸/笑/歌/触"更生动)。

| 字 | 维度 | 含义 | 视觉/象征 | 与其他互动的呼应 |
|----|------|------|----------|------------------|
| **雨** | 氛围 | 细雨/水滴/涟漪(主页氛围的核心意象) | 浅蓝透明,落/眸/触 都涉及水波 | 联动 §6.1 细雨 canvas + 涟漪(本节) |
| **字** | 排版 | IBM Plex 字体族 + §-style 编辑风 | 衬线大字,巨字 200px 排版 | 5 帧巨字 + 副文案诗意化 |
| **色** | 色彩 | 6 主题色(蓝/紫/粉/红/橙/青)+ 暖白底 | 6 色块 + 暖白底 | 联动 §6.8 主题色切换(也是 Slide 03 主场) |
| **动** | 动效 | CSS scroll-driven + view-transition | 错峰 fade-up + 字符级转场 | 5 帧联动 ④ 巨字转场 |
| **链** | 连接 | 互动之间的回响 + 跨 slide 状态 | 5 帧联动网络 + progress 累积 | 5 帧联动 ② 状态回响 + ⑤ 进度累积 |

#### 6.12.2 设计区结构(大方版 · 已锁定)

> **核心原则:大方。** 整段 100vh(占满整个 viewport),5 个字作为巨字标题浮在主图上,主图占视觉主体 60-70%,四周留白宽。
> **为什么不选小方案**:5 个字小而拥挤会"碎",涟漪也没空间展开。大方才有"design manifesto 宣言"感。

**结构**(从上到下):
```
┌────────────────────────────────────────────────────────────────┐
│ <nav> ← Hero 结束(上一段)                                       │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   [小标题]                                                     │
│   design system                                                 │
│   ─── 5 个维度 · 雨/字/色/动/链 · 涟漪交互 ───              │  ← 顶部标题区
│                                                                │
│   雨          字          色          动          链            │  ← 5 个巨字横排
│   (1)         (2)         (3)         (4)         (5)          │  ← 编号
│   氛围         排版         色彩         动效         连接          │  ← 副文案(小字)
│   雨滴/水滴    IBM Plex     6 主题色     scroll-driven  跨 slide  │  ← 描述
│                                                                │
│   ╭──────────────────────────────────────────╮                │
│   │                                            │                │
│   │                                            │                │
│   │         主图(用户 AI 生成,待出)              │                │  ← 中央大主图
│   │         涟漪作用其上(60-70vh)              │                │  ← 涟漪舞台
│   │                                            │                │
│   │         鼠标 hover/click 触发波纹            │                │
│   │                                            │                │
│   ╰──────────────────────────────────────────╯                │
│                                                                │
│   "5 个维度,串成 1 个会动的 design system"  ← 设计区副文案       │  ← 底部文案
│   ─── (微动效)──                                            │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│ 5 帧猫娘分镜(下一段)                                            │
└────────────────────────────────────────────────────────────────┘
```

**关键尺寸(大方版)**:
- 整段高度:**100vh**(占满整个 viewport,不短)
- 顶部小标题:`clamp(14px, 1.4vw, 18px)`,留白大
- 5 个巨字:**`clamp(80px, 12vw, 180px)`**(占主图上方,横向铺开)
- 5 字间距:`gap: clamp(40px, 6vw, 120px)`(宽到能"呼吸")
- 5 字下方副文案:`clamp(11px, 0.9vw, 14px)`,极小,只起注释作用
- 主图区域:**60-70vh**(占整段 60-70%),宽 `min(80vw, 1200px)`(居中)
- 主图边距:距 5 字下方 `clamp(40px, 6vh, 80px)`
- 底部副文案:`clamp(14px, 1.2vw, 18px)`,居中
- 整体 padding:`clamp(60px, 8vh, 120px) top/bottom`,`clamp(40px, 6vw, 120px) left/right`

**5 个字的具体含义(可悬停查看 / 移动端点击)**:
- **雨**(1) — 氛围 · 细雨/水滴/涟漪(与 §6.1 细雨 canvas 呼应)
- **字**(2) — 排版 · IBM Plex 字体族 + 巨字 200px(与 5 帧巨字呼应)
- **色**(3) — 色彩 · 6 主题色(蓝/紫/粉/红/橙/青) + 暖白底(与 §6.8 主题色切换 + Slide 03 笑 主场呼应)
- **动**(4) — 动效 · CSS scroll-driven + view-transition(与 5 帧联动 ④ 巨字转场呼应)
- **链**(5) — 连接 · 跨 slide 状态回响 + progress 累积(与 5 帧联动 ② + ⑤ 呼应)

**视觉效果(大方感)**:
- 5 个巨字横向铺开,之间间距大,**像宣言不像装饰**
- 主图占主视觉,涟漪作用其上,**空间够涟漪展开**(不像小卡片挤在一起)
- 顶部小标题 + 底部副文案**首尾呼应**,把整段"包"起来
- 四周留白多,**视觉有"高级杂志"感**,不是拥挤的 UI

**主图(用户出)**:
- 用户自己 AI 生成(待出)
- 推荐 1 张抽象渐变 / 几何构成 / 设计作品(不限于猫娘),但要"耐看"且能 hold 住涟漪扭曲
- 出图后放入 `assets/images/design-{320,480,720,1024,1920}.webp`(5 个尺寸)
- 移动端用 320-720,桌面用 720-1920

**降级占位**(主图未到位时):
- CSS 生成 1 张占位渐变(`linear-gradient(135deg, #dbeafe 0%, #fef3c7 100%)`)+ 简单几何 SVG(几个浮动圆形)
- 主图到位后替换 `data-src` 即可,无需改其他代码

#### 6.12.3 涟漪特效(reactbits.dev RippleDistortion)

> **来源**:reactbits.dev 的开源 React 组件 `RippleDistortion`(JavaScript + CSS 变体)
> **依赖**:ogl(WebGL 库,~30KB 从 CDN 加载)
> **重写**:vanilla JS 版本(无 React),原 GLSL shader 100% 复用

**核心视觉**:
- 鼠标 hover 时,自动在指针位置产生**涟漪波纹**(从中心向外扩散,逐渐衰减)
- 鼠标 click 时,产生**加强涟漪**(2x 强度)
- 涟漪让图像产生**位移扭曲**(像水波推开倒影)
- 支持灰度(`grayscale: true` 让涟漪在色调上更明显)
- 支持染色(`tint` 给涟漪叠加颜色,如紫色 #a855f7)
- 支持色散(`dispersion` 制造 R/B 通道分离,折射效果)
- 支持光泽(`glint` 波峰高光)

**关键参数(本主页推荐配置)**:
- `brushSize: 150` — 涟漪直径 150px(适中)
- `strength: 0.25` — 推力 25%(温和可见)
- `swirl: 1.5` — 旋涡 1.5 圈(有 caustics 感)
- `rings: 4` — 4 重同心波(标准)
- `grayscale: true` — 灰度(让涟漪更突出)
- `tint: var(--color-accent)` — 染色跟随主题色(联动 §6.8)
- `trigger: both` — hover + click 双触发
- `quality: low` — 低分辨率(填充率优先,30KB 性能开销可接受)

**性能**:
- `prefers-reduced-motion: reduce` → 关闭 WebGL,改用静态 `<img>` 替代
- `quality: low` → displacement buffer 0.4x 分辨率,60fps 稳定
- 仅在设计区运行,不与其他 9 项互动抢 GPU

**降级**:
- 不支持 WebGL → 静态 `<img>` 替代
- ogl CDN 加载失败 → 静态 `<img>` 替代
- `prefers-reduced-motion: reduce` → 静态 `<img>` 替代
- 移动端 → 仍启用(用 hover/click 触发,因为有 touchstart)

#### 6.12.4 涟漪与设计区的视觉权重

- 涟漪**视觉极强**(持续 GPU 渲染 + 灰度 + 染色),作为"wow 时刻"
- 5 个字作为设计区**信息层**(不抢戏,但传达 design system 概念)
- 涟漪触发时,5 个字**不动**(避免视觉过载)
- 鼠标离开设计区 → 涟漪自动衰减(3s 内完全消失)

#### 6.12.5 与其他互动的优先级

- 设计区涟漪是**独立的视觉特效**,不与其他 9 项互动(细雨/打字机/涟漪 CSS/视差/进度条 + 4 融入)联动
- **唯一联动**:涟漪染色跟随主题色(§6.8 主题色切换时,涟漪 tint 0.4s 渐变)
- 这是**第 10 项互动**,作用域独立

#### 6.12.6 锁定决策(已定)

- [x] **设计区结构 = 大方版**(整段 100vh + 5 巨字横排 + 60-70vh 大主图,见 §6.12.2)
- [x] **设计区主图 = 用户自己 AI 生成**(待出,出图后放入 `assets/images/design-{320,480,720,1024,1920}.webp`,5 个尺寸)
- [x] **移动端同步启用涟漪**(电脑端 hover/click + 移动端 tap 等同 click,行为一致;详细适配见 §6.12.7)
- [x] **涟漪染色 = 跟随主题色**(`tint: var(--color-accent)`,联动 §6.8)
- [x] **降级占位图 = CSS 渐变 + 几何 SVG**(主图未到位时使用,主图到位后只需替换 `data-src`)

#### 6.12.7 移动端适配(同步电脑端)

> **原则:移动端和电脑端体验一致**。不简化、不阉割,只是布局自适应。

**布局变化**:

| 元素 | 电脑端 (≥ 768px) | 移动端 (< 768px) |
|------|------------------|------------------|
| 整段高度 | 100vh | 100vh(同步) |
| 5 巨字 | 横向 1×5 铺开,clamp 80-180px | 横向 1×5 铺开,clamp 50-90px(缩) |
| 5 字间距 | gap 40-120px | gap 16-32px(密) |
| 5 字副文案 | 横向 1×5 铺开 | 横向 1×5 铺开(单行) |
| 主图尺寸 | min(80vw, 1200px) × 60-70vh | 90vw × 50vh |
| 整体 padding | 60-120px / 40-120px | 32-48px / 16-24px |
| 顶部小标题 | 1.4vw | 1.6vw(略大) |
| 底部副文案 | 1.2vw 居中 | 1.4vw 居中 |

**交互差异(只触发方式,效果一致)**:
- 电脑端:hover 自动产生涟漪(1x),click 产生加强涟漪(2x)
- 移动端:**tap = click 等同**(涟漪 2x 强度),`pointermove` 在触屏不触发
- 移动端不启用 hover(因为没有鼠标悬停概念)
- 长按(touch 长按 500ms)= 持续产生涟漪(类似 hover 持续效果)

**性能保护(移动端更严)**:
- 移动端 `quality: low` 必须(displacement buffer 0.4x)
- 移动端 `brushSize: 100`(比桌面 150 小,降低 GPU 负担)
- 移动端 `fade: 2.5`(比桌面 3s 短,涟漪更快消亡)
- 移动端检测:屏幕宽度 < 768 或 `navigator.maxTouchPoints > 0`

**降级(移动端更激进)**:
- `prefers-reduced-motion: reduce` → 静态图(两端都生效)
- iOS Safari 14 以下 → 静态图(WebGL 兼容性差)
- 移动端 `navigator.deviceMemory < 4` → 静态图(内存不够)
- 检测到 `connection.saveData === true` → 静态图(省流量)

**触屏适配细节**:
- `<div class="ripple-mount">` 添加 `touch-action: manipulation`(禁用双击缩放)
- 涟漪挂载点 `min-height: 50vh`(移动端可点击区域不能太小)
- tap 涟漪 `clickStrength: 2.5`(比桌面 2 略大,因为 tap 是单次操作,需要更"重"的反馈)
- tap 涟漪 `fade: 1.5`(移动端消亡更快,避免 tap 多次后涟漪堆积)

**viewport 配置**(html 头):
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
```
(防止移动端 pinch 缩放破坏涟漪坐标系)

---

> **完整实现代码(HTML + ripple.js)见 `code-snippets.md` § #21**(实施时按需复制)


## 7. 设计系统

### 7.1 Token（沿用 V5 + 新增）

| Token | 值 | 用途 |
|-------|-----|------|
| `--color-paper` | `#f8fafc` / `#0f172a` | 背景 |
| `--color-ink` | `#0f172a` / `#e2e8f0` | 正文 |
| `--color-accent` | `#2563eb` / `#60a5fa` | 强调（**可被 playground 切换**）|
| `--color-rule` | `rgba(15,23,42,.12)` | 分隔线 |
| `--color-shadow` | `rgba(0,0,0,.06)` | 阴影 |
| `--avatar-size-hero` | `clamp(160px, 20vw, 240px)` | Hero 头像 |
| `--hero-title-size` | `clamp(48px, 6.5vw, 96px)` | Hero 标题 |
| `--rain-drop-color` | 浅/深蓝透明 | 雨滴 |
| `--ripple-color` | `var(--color-accent)` | 涟漪 |
| `--typewriter-speed` | `60ms` | 打字机 |
| `--parallax-avatar/title/tagline` | `0.3 / 0.5 / 0.7` | 视差 |
| `--progress-height` | `2px` | 进度条 |
| `--accent-transition` | `600ms ease` | 主题色切换过渡 |
| `--token-radius` | `12px` | tokens 卡片圆角 |

### 7.2 多页共享设计系统

`style.css` + `script.js` + `assets/` 全部共享，**每个分页只需替换 `<main>` 内容**。

### 7.3 降级策略

| 不支持 | 降级 |
|--------|------|
| `animation-timeline: scroll()` | 视差/进度条失效（保持原位）|
| `animation-timeline: view()` | 入场失效（立即显示）|
| `prefers-reduced-motion` | 全部互动关闭，静态显示 |
| `localStorage` | 主题色默认蓝，不持久化 |
| `clipboard.writeText` | fallback 用 `document.execCommand('copy')` |

---

## 8. 实施步骤

| # | 步骤 | 风险 |
|---|------|------|
| 1 | 出头像（主人自拍）| - |
| 2 | **出 5 帧 AI 图**（主人用 §1.1 锁定 prompt 风格 + §4.5.8 联动①姿态连贯约束）| - |
| 3 | 落蓝图 | ✅ |
| 4 | 头像放入 `/assets/images/avatar-{320,480,720,1024}.webp`（多尺寸）| 低 |
| 5 | 5 帧放入 `/assets/images/frame-{01-05}-{320,480,720,1024}.webp`（20 个文件）| 低 |
| 6 | **新建** `pages/about.html` `pages/projects.html` `pages/contact.html`（内容从 V5 §4 §3 §5 移植）| 中 |
| 7 | `index.html` **重写**:nav + Hero + **设计区(雨/字/色/动/链 · 涟漪)** + §4.5 滑动展示(**无 footer · 无 playground**)| 中 |
| 7a | `ripple-distortion.js` 引入(从 `/.blueprint/` 复制到项目根)+ ogl CDN 加载 | 低 |
| 8 | Hero 加 `<img class="avatar">` 在**右方** | 低 |
| 9 | `style.css` 加 `.avatar` 样式（兼容 CSS 原生视差）| 低 |
| 10 | **互动 6.1**：细雨 canvas | 中 |
| 11 | **互动 6.2**：Hero 打字机 | 低 |
| 12 | **互动 6.3**：点击涟漪 | 低 |
| 13 | **互动 6.4**：Hero 视差（**CSS 原生**）| 低 |
| 14 | **互动 6.5**：阅读进度条（**CSS 原生**）| 低 |
| 15 | **§4.5 滑动展示**：5 张 slides + scroll-snap + indicator + dots | 中 |
| 16 | **§4.5 滑动展示**：wheel→horizontal + IO 同步 | 中 |
| 17 | **互动 6.6** 现在 widget（**融入 Slide 01 角落**）| 低 |
| 18 | **互动 6.7** tokens 显示（**融入 Slide 02 角落**）| 低 |
| 19 | **互动 6.8** 主题色切换（**融入 Slide 03 主场**）| 中 |
| 20 | **互动 6.9** 5 项动效 mini demo（**融入 Slide 04 主场**）| 中 |
| 21 | **互动 6.11** 联系（**融入 Slide 05**）| 低 |
| 22 | **联动 ⑤ 进度累积**：顶部细线 + dots（30min）| 低 |
| 23 | **联动 ② 跨 slide 状态回响**：localStorage + CustomEvent（2-3h）| 中 |
| 24 | **联动 ③ 共享背景层**：1 个 fixed canvas + 粒子形态渐变（1-2h）| 中 |
| 25 | **联动 ④ 巨字字符级转场**：SVG clip-path + view-transition（4-6h）| **高** |
| 26 | 自检：移动端 + 深色模式 + `prefers-reduced-motion` + `@supports` 降级 | 低 |
| 27 | Lighthouse 跑分（目标 ≥ 90）| 低 |
| 28 | **设计区结构(大方版)**:整段 100vh + 5 巨字横排 + 60-70vh 大主图(HTML + CSS 排版) | 中 |
| 29 | **设计区涟漪集成**:`ripple-distortion.js` 部署 + ogl CDN + `ripple-mount` 挂载点(15min) | 低 |
| 30 | **设计区移动端适配**:触屏 tap + 性能保护 + 触屏降级(见 §6.12.7) | 中 |
| 31 | **设计区降级占位图**:CSS 渐变 + 几何 SVG(主图未到位时) | 低 |

**头像到位后给我**：4 个尺寸的 webp + alt 文案。
**5 帧到位后给我**：5 × 4 = 20 个 webp 文件 + 每帧选中版本号（frame-01-luo 选了第 3 张等）。
**设计区主图到位后给我**:1 × 5 = 5 个尺寸的 webp(320/480/720/1024/1920)+ 选中版本号。

---

## 9. 决策清单

| # | 问题 | 选择 | 状态 |
|---|------|------|------|
| 1 | 主页范围 | Hero + **滑动展示**（**无 footer · 无 playground**）| ✅ |
| 2 | 头像方案 | A · 插画猫娘 | ✅ |
| 3 | Hero 姿势 | avatar **在右方**，文在左 | ✅ |
| 4 | 头像形状 | **圆形** | ✅ |
| 5 | 头像视觉地位 | 当主角 | ✅ |
| 6 | 主题色默认 | 蓝 `#2563eb` | ✅ |
| 7 | 主题色可选 | 6 色（蓝/紫/粉/红/橙/青）| ✅ |
| 8 | **互动融入 slide** | 4 项（现在/tokens/主题色/动效 demo/联系）| ✅ |
| 9 | playground 区块 | **已移除**（全部融入 5 slides）| ✅ |
| 10 | footer | **无** | ✅ |
| 11 | 分页数量 | 4 个（项目/关于/联系/动态）| ✅ |
| 12 | "动态"处理 | 独立 now page（可选）| ⏳ |
| 13 | **滑动展示（§4.5）** | **5 张横向 snap-scroll**（落/眸/笑/歌/触）| ✅ |
| 14 | 滑动展示交互 | 滚轮转横向 + dots + indicator | ✅ |
| 15 | 互动 6.1-6.5 | 沿用 V5（页面级）| ✅ |
| 16 | 互动 6.6-6.11 | 6 项融入 slide | ✅ |
| 17 | §6.4 视差改 CSS 原生 | 是 | ✅ |
| 18 | 头像 hover 微动效 | 不做 | ⏳ 默认 |
| 19 | 设计作品位置 | project page | ✅ |
| 20 | **5 帧视觉策略** | **5 帧全 AI 图 + CSS 撑包装**(巨字/氛围/动效/容器 CSS) | ✅ |
| 21 | 站内图片资源 | **共 6 张**(1 头像 + 5 帧,各 4 尺寸 webp = 24 个文件) | ✅ |
| 22 | **5 帧联动** | **all-in 5 项**（① 姿态连贯 + ② 状态回响 + ③ 共享背景 + ④ 巨字转场 + ⑤ 进度累积） | ✅ |
| 23 | **设计区 + 涟漪** | **大方版** · 100vh + 5 巨字横排 + 60-70vh 大主图,WebGL ogl + vanilla 重写 ripple,hover+click+移动 tap 触发 | ✅ |
| 24 | 设计区主图 | 用户自己 AI 生成(待出,5 尺寸 webp) | ⏳ 待出图 |
| 25 | 设计区移动端 | **电脑端移动端同步启用**(只是布局自适应,效果一致) | ✅ |
| 26 | 涟漪降级 | CSS 渐变 + 几何 SVG 占位图(主图未到位时使用) | ✅ |

**23 已定 / 3 待定**（"动态"是不是独立 page + hover 微动效 + 设计区主图待出）

---

## 10. 验收清单

### 主页结构
- [ ] 主页只剩 nav + Hero + **滑动展示**（**无 footer · 无 playground**）
- [ ] avatar 在 Hero **右方**（桌面） / 文字上方（移动）
- [ ] avatar 是**圆形**

### 滑动展示（§4.5 · 5 张）
- [ ] 5 张 slides 全宽横向 snap
- [ ] 每张 100vh（桌面）/ 80vh（移动）
- [ ] 巨字 `clamp(80px, 14vw, 200px)` 够大
- [ ] 滚轮在 slides 区域内转横向滚动
- [ ] indicator 显示当前 N° 01/05
- [ ] dots 按钮可点跳转
- [ ] 键盘左右键可切换
- [ ] `prefers-reduced-motion` 关闭 wheel→horizontal

### 各 slide 内嵌互动
- [ ] **Slide 01 落**：🕐 现在 widget（时间每秒更新）
- [ ] **Slide 02 眸**：📐 tokens（点击复制）
- [ ] **Slide 03 笑 ⭐**：6 大色块，点击全站换主题色
- [ ] **Slide 03 笑**：选择持久化到 localStorage
- [ ] **Slide 04 歌 ⭐**：5 个 mini demo 可点触发
- [ ] **Slide 05 触**：GitHub 链接 / Email 复制 + 反馈

### 页面级互动（5 项）
- [ ] **6.1 细雨**：浅 80 / 深 150 滴
- [ ] **6.2 打字机**：tagline 逐字
- [ ] **6.3 涟漪**：点击触发，5 个上限
- [ ] **6.4 视差**：CSS 原生版 3 层速度差
- [ ] **6.5 进度条**：nav 下 2px 蓝线

### 分页
- [ ] `pages/projects.html` 内容齐全
- [ ] `pages/about.html` 内容齐全
- [ ] `pages/contact.html`（可选）内容齐全
- [ ] `pages/now.html`（如选）内容齐全
- [ ] nav 链接全部正确指向

### 整体
- [ ] 所有互动 `prefers-reduced-motion` 降级
- [ ] `animation-timeline` 降级
- [ ] 移动端不掉档
- [ ] Lighthouse ≥ 90

### 设计区 + 涟漪(大方版 · 第 2 段)
- [ ] 整段 100vh 高度占满 viewport
- [ ] 5 个巨字(雨/字/色/动/链)横向铺开,间距 40-120px(电脑端)/ 16-32px(移动端)
- [ ] 5 个字的副文案(氛围/排版/色彩/动效/连接)+ 编号(1-5)+ 描述(雨滴/水滴等)显示正确
- [ ] 主图占 60-70vh(电脑端)/ 50vh(移动端),居中,宽 min(80vw, 1200px)
- [ ] 顶部小标题"design system" + 副标题"5 个维度 · 雨/字/色/动/链 · 涟漪交互"显示
- [ ] 底部副文案"5 个维度,串成 1 个会动的 design system"显示
- [ ] 整体 padding 60-120px / 40-120px(电脑端),32-48px / 16-24px(移动端)
- [ ] 鼠标 hover 主图 → 自动产生涟漪(1x 强度,150px 直径)
- [ ] 鼠标 click 主图 → 加强涟漪(2x 强度)
- [ ] 移动端 tap 主图 → 加强涟漪(2.5x 强度)
- [ ] 涟漪染色跟随主题色(§6.8 切换时 0.4s 渐变)
- [ ] 涟漪移动端参数:brushSize 100 / fade 2.5 / quality low
- [ ] ogl CDN 加载失败 → 降级为静态图
- [ ] `prefers-reduced-motion: reduce` → 降级为静态图
- [ ] 移动端 `navigator.deviceMemory < 4` → 降级为静态图
- [ ] 主图未到位时 → CSS 渐变 + 几何 SVG 占位图
- [ ] 整段在 iOS Safari 14+ 正常工作(WebGL 兼容)

---

## 11. 可选增强

- [ ] 头像 hover 微动效（眨眼/摇尾巴）
- [ ] 主题色保存的"上一选择"按钮
- [ ] now widget 显示真实 commit 状态（GitHub API）
- [ ] playground 加一个"复制整个 design system" 按钮
- [ ] 主题色切换时 hero 头像边框颜色也同步（已经自动）
- [ ] 隐藏彩蛋：连按 5 次头像 → 雨变暴雨

---

## 附录(已移除)

> **完整代码已迁移到 `/.blueprint/code-snippets.md`**,共 35 段代码块。
> 实施时按需复制到 `index.html` / `style.css` / `script.js`。

**附录 A 原内容包含:**
- index.html 完整结构(nav + Hero + 5 slides + script)
- style.css 核心样式(layout / nav / hero / slide / 互动)
- script.js 完整逻辑(细雨 / 打字机 / 涟漪 / 视差 / 进度条 / IO 同步 / 主题色)

**附录 B 原内容包含:**
- 5 frames HTML 完整 markup(含 picture 元素、widgets、CSS 音符)
- 5 frames CSS(5 帧布局 + 4 互动 + 联动 ⑤ 进度条)
- 5 frames JS(IO 同步 + 进度累积 + 主题色 + 视差)
