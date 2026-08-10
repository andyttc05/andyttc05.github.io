# 个人网站设计提示词（Design Prompt）· 2026

> 用途：本文件是一份**可直接交给其他 AI（如编码 Agent、设计助手）执行的个人网站设计规格书**。
> 顶部是「浓缩总提示词」，可整段复制使用；下方是分项详细规范，供需要逐条落地的场景参考。
> 所有建议均基于 2025–2026 年真实设计趋势研究（见文末「灵感来源」），并刻意规避「AI 生成感」的同质化套路。

---

## 0. 浓缩总提示词（复制即用）

```
请为我构建一个现代个人网站（个人品牌/作品集/博客合一），定位为「有温度的专业数字名片」。

【定位与目标受众】
- 定位：克制、专业、有人格魅力的个人站点，体现主人的专业能力与个性，不以炫技为目的。
- 目标受众：潜在雇主 / 客户 / 合作者 / 同好；以移动端为主的扫描式阅读用户。

【信息架构（板块）】
1. 首页 Hero：首屏一句话说清「你是谁 + 你做什么 + 能帮别人解决什么」，含姓名、角色、主 CTA。
2. 关于 About：短故事 + 关键技能 + 独特之处，口语化但专业，配一张真实照片。
3. 作品集 Portfolio / Work：仅展示 4–8 个最佳项目，每个含背景、你的角色、做法、可量化结果、截图/演示。
4. 专业/服务 Expertise：把能力拆成可消化的模块，附社会证明（评价、案例）。
5. 博客 Blog / 洞察（可选）：定期输出，提升 SEO 与回访。
6. 联系 Contact：邮箱 + 表单 + 社交链接，多通道、易触达。
7. 可选：推荐语 Testimonials、简历 Resume 下载。

【视觉风格】
- 方向：现代极简 + 温暖质感（restorative minimalism）。留白即结构，而非空洞。
- 配色：浅色为「云白 #F0F0EB 背景 + 浓缩咖啡棕 #292524 正文 + 陶土橙 #E2725B 或 转化青 #1F5C63 作强调色」；深色（Mood Mode）为「炭灰 #121212 背景 + 米白 #E8E6E1 正文 + 同色系强调」。全程用 CSS 变量，禁止硬编码色值。
- 排版：大字号展示型标题（用 clamp() 流体缩放）+ 干净无衬线正文；推荐字体 Clash Display / Space Grotesk（标题）+ Inter / Satoshi（正文），可变字体优先。正文 16–18px，行高 1.6–1.7。
- 布局：首页用 Bento 网格（大小不一的圆角卡片），其余板块用清晰单列/双列节奏；可见细线分隔，但不喧宾夺主。

【交互与动效】
- 微交互：每个可交互元素都要有 hover 反馈（卡片轻微上浮 translateY(-4px) + 阴影；按钮变色/微缩放）。
- 滚动揭示：进入视口时 fade-up（opacity 0→1, translateY 20px→0，0.5–0.7s ease-out），网格项错峰 100ms。
- 动效时长 150–300ms，缓动用 ease-out（进入）/ ease-in（退出）。
- 必须支持 prefers-reduced-motion：关闭非必要动画。
- 原则：动效只为「引导注意力 / 确认操作 / 状态反馈」，无功能的装饰动效一律删除。

【响应式】
- 移动优先（Mobile-first）。断点：480 / 768 / 1024 / 1280px。
- 导航在移动端折叠为汉堡菜单或底部锚点；Bento 卡片在窄屏自然重排为单列。
- 触控友好：点击目标 ≥ 44px。

【技术约束】
- 纯静态优先（HTML + CSS + 极少 JS），可交付为 GitHub Pages / 静态托管。
- 性能预算：整页 < 1MB，Lighthouse 性能分 ≥ 90，LCP < 2.5s，CLS < 0.1，INP < 200ms。
- 优先 CSS 动画（transform/opacity，GPU 加速）而非 JS；滚动动画可用 CSS scroll-driven animations 或 IntersectionObserver。
- 无障碍：WCAG AA 对比度，语义化标签，图片 alt，键盘可达，可见 focus 态。
- 资源：图标用内联 SVG；图片懒加载（loading="lazy"）；字体用 system/variable font，限制字体文件数量。
- 交付结构：index.html + /assets/css/style.css + /assets/js/main.js + /assets/img/。

请先输出站点信息架构与视觉规范（色板、字号表、间距），再实现首页与各板块，最后做响应式与无障碍自检。
```

---

## 1. 网站定位（Positioning）

| 维度 | 说明 |
|------|------|
| **核心定位** | 主人的「有温度的专业数字名片」——既展示能力与作品，又传递真实人格，避免千站一面的「AI 模板感」。 |
| **设计哲学** | Restorative Minimalism（疗愈式极简）：留白是结构元素而非空白；每个元素都必须有存在理由；温暖、克制、专业。 |
| **差异化策略** | 拒绝纯白冷感 + 科技蓝的套路；用暖中性底色 + 单一有性格的强调色 + 真实照片/手作质感，让人记得住。 |
| **不做的事** | 不做过度装饰、不做满屏动画、不做与内容无关的股票图渐变、不做页数膨胀（核心 5–7 页足够）。 |

> 军师建议：如果主人是开发者/设计师/创作者，本定位通用；若偏「咨询/法律/金融」等严肃领域，把强调色换成深青或墨棕、减弱活泼感即可（见 §4 配色变体）。

---

## 2. 目标受众（Target Audience）

- **主要**：潜在雇主、客户、合作方、招聘官——他们用**手机**、**快速扫描**、在几秒内判断「这人靠谱吗」。
- **次要**：同行/同好——来找深度内容（博客、作品细节）。
- **设计推论**：
  - 首屏必须在 3 秒内传达「你是谁 + 你能帮什么」。
  - 一切为「扫描」优化：清晰层级、短句、强 CTA。
  - 移动端体验 = 第一优先级，不是退而求其次。

---

## 3. 信息架构与核心板块（Sections）

> 全局导航保持极简：**Home / About / Work / (Blog) / Contact**。移动端折叠为汉堡菜单或底部锚点导航。

### 3.1 首页 Hero（首屏）
- 一句话价值主张：`姓名 + 角色 + 你能帮别人解决什么`（例：「我是 Andy，帮初学者把 Git 学到能上手」）。
- 元素：大字号展示标题、一句副文案、1 个主 CTA（如「看我的作品」）、1 个次 CTA（如「联系我」）。
- 可选：右侧真实照片 / 或纯排版型 hero（无图，用超大字号当视觉主体）。
- 避免：堆砌头衔、自动播放视频背景、模糊的 stock 图。

### 3.2 关于 About
- 口语化短故事：背景 → 关键技能 → 你**独特**在哪。
- 配一张真实、自然、显得亲切自信的照片。
- 可加：技能标签云、时间线（精简版）。

### 3.3 作品集 Portfolio / Work
- **只放最佳 4–8 个**，质量 > 数量。
- 每个项目卡片含：**背景/目标 → 你的角色与贡献 → 方法 → 可量化结果 → 截图/演示链接**。
- 首页用 **Bento 网格**呈现（大小不一的圆角卡片，hover 时展开更多内容/播放预览）。
- 详情页（或展开态）承载完整叙事。

### 3.4 专业 / 服务 Expertise（可选，接单用）
- 把能力拆成可消化模块，每条带清晰价值主张。
- 附社会证明：客户评价、案例、认证 logo 墙。

### 3.5 博客 Blog / 洞察（可选，但强烈推荐）
- 提升 SEO、建立权威、带来回访。
- 列表用卡片/简洁排版，文章页注重可读性（宽行距、代码块、目录）。

### 3.6 联系 Contact
- 多通道、零摩擦：邮箱 + 表单（前端校验 + 提交 loading 态）+ 社交链接。
- 可加：时区/所在地/可接单状态。
- 表单反馈动效：输入聚焦发光、提交变 loading、成功打勾。

### 3.7 可选增强板块
- **推荐语 Testimonials**：3–5 条真实评价，网格或轮播。
- **简历 Resume**：可下载 PDF，作为补充而非主体。
- **Logo 墙 / 媒体报道**：增加信任。

---

## 4. 视觉风格系统（Design System）

### 4.1 配色（Color Tokens）
> 全部用 CSS 自定义属性管理，禁止在组件里硬编码 hex。浅色为默认，深色通过 `prefers-color-scheme` 或手动切换。

**默认浅色（Light）—— 暖中性基底 + 单一强调色**

| Token | 用途 | 值 |
|-------|------|----|
| `--bg` | 页面背景 | `#F0F0EB`（Cloud Dancer 暖云白）|
| `--surface` | 卡片/区块 | `#FAFAF9` 或 `#FFFFFF` |
| `--text` | 正文 | `#292524`（浓缩咖啡棕，非纯黑）|
| `--text-muted` | 次要文字 | `rgba(41,37,36,0.6)` |
| `--border` | 分隔线 | `rgba(41,37,36,0.12)` |
| `--accent` | 强调色（主 CTA/链接）| `#E2725B`（陶土橙 Terracotta）|
| `--accent-2` | 次强调（可选）| `#1F5C63`（转化青 Transformative Teal）|

**深色（Mood Mode）—— 多层级炭灰，非纯黑**

| Token | 用途 | 值 |
|-------|------|----|
| `--bg` | 背景 | `#121212` |
| `--surface` | 卡片 | `#1A1A1A` / `#1E1E1E` |
| `--text` | 正文 | `#E8E6E1`（米白，非纯白）|
| `--text-muted` | 次要文字 | `rgba(232,230,225,0.65)` |
| `--border` | 分隔线 | `rgba(232,230,225,0.12)` |
| `--accent` | 强调色 | 同浅色系（陶土橙 / 青）|

**配色变体（按领域切换 `--accent`）**
- 创意/个人品牌：`#E2725B` 陶土橙、`#E65C00` 橘子橙（Dopamine 活力）
- 技术/开发工具：`#1F5C63` 转化青、`#39FF14` 霓虹绿（克制使用，占比 < 2% 屏幅）
- 严肃/咨询/金融：`#4A3A32` 可可棕、`#1F5C63` 深青

> 军师提示：强调色全站**只用一个主色**，占比控制在屏幅 2% 以内做点睛，其余靠字号/留白/线条建立层级。

### 4.2 排版（Typography）
- **标题字体**（展示型，有性格）：`Clash Display` / `Space Grotesk` / `Cabinet Grotesk`
- **正文字体**（干净易读）：`Inter` / `Satoshi` / `IBM Plex Sans`
- **点缀衬线**（可选，用于引号/数字）：`Fraunces`（可变字体，带温度）
- **优先使用可变字体（Variable Font）**：单文件覆盖多字重，省请求、可流畅过渡。
- **流体字号**（用 `clamp()`，移动→桌面平滑缩放）：
  - 展示大标题 H1：`clamp(2.5rem, 6vw, 5rem)`
  - H2：`clamp(1.75rem, 3.5vw, 2.75rem)`
  - H3：`clamp(1.25rem, 2vw, 1.5rem)`
  - 正文：`clamp(1rem, 1.1vw, 1.125rem)`（16–18px）
  - 小字/标签：0.875rem
- **排版细节**：正文行高 1.6–1.7，标题行高 1.1–1.2，字间距标题略收紧、正文正常；长文段落 max-width ≈ 65–75 字符。

### 4.3 间距 / 圆角 / 阴影
- **间距尺度**（8pt 基准）：4 / 8 / 16 / 24 / 32 / 48 / 64 / 96 / 128 px。区块垂直间距建议 ≥ 96px，制造呼吸感。
- **圆角**：卡片 16–20px，按钮 10–12px（或全圆角 pill 8px+ 看风格）。
- **阴影**：浅色用柔和长阴影（`0 4px 24px rgba(0,0,0,0.06)`）；hover 卡片加深（`0 12px 32px rgba(0,0,0,0.12)`）。深色用更亮的一层 surface 表现层级，而非深色阴影。
- **可见细线**：可用 1px `--border` 强调网格/分区，是 2026「可见线框」趋势的克制应用。

### 4.4 其他质感
- 可选极淡噪点/颗粒叠加（低透明度 SVG noise）增加「人手作」温度，对抗 AI 塑料感。
- 有机形状分隔（波浪/ blob）可用于板块过渡，但克制使用。

---

## 5. 交互与动效规范（Interaction & Motion）

> 总原则：**动效服务于功能**（引导注意力 / 确认操作 / 状态反馈）。不能帮用户做决定的动效 = 噪音，删掉。

| 类型 | 规范 | 实现要点 |
|------|------|----------|
| **Hover（卡片）** | 轻微上浮 + 阴影增强 | `transform: translateY(-4px)` + `box-shadow`，`transition: .25s ease`（写在默认态，进出都顺滑）|
| **Hover（按钮）** | 主 CTA 微缩放+光晕；次按钮变色/填充 | `scale(1.03)` + accent 阴影；ghost 按钮填充反色 |
| **Hover（链接/导航）** | 下划线生长 / 颜色过渡 | 避免背景突变（遵循主人偏好的「纯颜色变化」原则）|
| **滚动揭示** | fade-up，进入视口触发 | `opacity 0→1, translateY(20px)→0`，0.5–0.7s ease-out；网格项错峰 `transition-delay` 100ms |
| **数字计数** | 进入视口时计数（如「服务过 50+ 客户」）| 仅用于有说服力的指标，避免滥用 |
| **加载态** | 骨架屏 / spinner / 进度条 | 表单提交按钮变 loading，防止「到底成没成」的焦虑 |
| **时长/缓动** | 150–300ms；进入 ease-out，退出 ease-in | 用 `cubic-bezier` 自然曲线，避免 linear |
| **Reduced Motion** | `@media (prefers-reduced-motion: reduce)` 关闭非必要动画 | 保留功能性状态变化（如颜色），去掉位移/闪烁 |

> 军师提示：主人此前明确偏好「hover 纯颜色变化、无 glow/无背景/无视觉回闪」。请在导航与链接处严格遵守此准则；glow/阴影仅用于卡片与 CTA，且要克制。

---

## 6. 响应式规范（Responsive）

- **策略**：Mobile-first。先写移动端样式，再用 `min-width` 媒体查询逐级增强。
- **断点**：`480px`（大手机）/ `768px`（平板）/ `1024px`（小笔记本）/ `1280px`（桌面）。
- **导航**：桌面横向；移动端汉堡菜单或底部锚点条。
- **Bento 网格**：用 CSS Grid `grid-template-columns: repeat(auto-fit, minmax(...))` 或显式 12 列；窄屏自然降为单列/双列，不断裂。
- **触控**：点击目标 ≥ 44×44px；避免 hover-only 信息（移动端无 hover，关键信息默认可见）。
- **图片/字体**：`clamp()` 流体排版；图片 `width:100%; height:auto` + `loading="lazy"`。
- **测试**：在真实中端 Android + 节流 3G 下验证滚动动画流畅度。

---

## 7. 技术约束（Technical Constraints）

### 7.1 技术栈（推荐）
- **纯静态优先**：`HTML + CSS + 极少量原生 JS`。可托管于 GitHub Pages / Netlify / Cloudflare Pages / Vercel。
- 若需博客，可用静态生成器（Astro / Eleventy / Jekyll / Hugo）或直接在仓库维护 Markdown→HTML。
- 避免引入重型框架（React/Vue）仅为一个静态站点——除非交互极复杂。
- 动效用**原生 CSS + 极少 JS**；复杂序列才考虑 GSAP（按需懒加载）。

### 7.2 性能预算（Performance Budget）
- 整页总重 **< 1 MB**（含字体/图片/CSS/JS）。
- Lighthouse：**性能 ≥ 90，可访问性 ≥ 95，最佳实践 ≥ 90，SEO ≥ 90**。
- Core Web Vitals：**LCP < 2.5s，CLS < 0.1，INP < 200ms**。
- 字体：优先 system font 或可变字体，字体文件 ≤ 2 个；用 `font-display: swap`。
- 图片：压缩（WebP/AVIF），`loading="lazy"`，关键图预加载。
- 动画：用 `transform`/`opacity`（GPU 加速）；批量 DOM 更新；`requestAnimationFrame` 做 JS 动画。

### 7.3 无障碍（Accessibility，WCAG 2.1 AA）
- 语义化标签：`<header> <nav> <main> <section> <article> <footer>`。
- 颜色对比度：正文/背景 ≥ 4.5:1，大字号 ≥ 3:1（用 WebAIM Contrast Checker 验证）。
- 所有图片有 `alt`；图标按钮有 `aria-label`。
- 键盘可达：所有交互元素可 Tab 聚焦，有**可见 focus 态**（不用 `outline:none` 裸奔）。
- 尊重 `prefers-reduced-motion` 与 `prefers-color-scheme`。
- 表单有 `<label>` 与错误提示（aria-live）。

### 7.4 SEO 基础
- 每个页面有唯一 `<title>` 与 `<meta description>`。
- 结构化数据（Person / 作品可用 JSON-LD）。
- 语义标题层级（H1 唯一，H2/H3 有序）。
- `sitemap.xml` + `og:` 社交分享卡片。

### 7.5 推荐交付文件结构
```
/ (站点根)
├─ index.html
├─ about.html  (或 /about/index.html)
├─ work.html
├─ blog/
│   ├─ index.html
│   └─ post-xxx.html
├─ contact.html
├─ assets/
│   ├─ css/style.css
│   ├─ js/main.js
│   └─ img/  (logo, photo, project shots, og-image)
├─ sitemap.xml
└─ README.md
```
> 若用静态生成器（如 Astro/Jekyll），结构按框架约定，但对外仍输出上述静态产物。

---

## 8. 验收清单（Definition of Done）

- [ ] 首屏 3 秒内说清「谁 / 做什么 / 能帮什么」，有主 CTA
- [ ] 导航 ≤ 5 项，移动端可用
- [ ] 作品集仅展示最佳项目，每项含背景/角色/结果
- [ ] 配色仅一个主强调色，浅/深双模式通过 CSS 变量切换
- [ ] 字号用 clamp() 流体缩放，正文行高 ≥ 1.6
- [ ] 每个可交互元素有 hover 反馈；动效 150–300ms
- [ ] 滚动揭示 fade-up，支持 reduced-motion
- [ ] 移动端单列重排，点击目标 ≥ 44px
- [ ] Lighthouse 性能 ≥ 90，整页 < 1MB
- [ ] WCAG AA 对比度 + 键盘可达 + 图片 alt
- [ ] 含 sitemap 与社交分享图

---

## 9. 灵感来源（Research References）

以下趋势与数据来自 2026 年设计行业研究，供复核与深挖：

1. **Modern Website Design 2026 — Trends, Navigation and Inspiration** — spoko.space/blog/modern-website-design-trends（Bento 网格、Dark Mode 2.0、动态排版、噪点质感、有机形状）
2. **Website Design Trends That Actually Matter in 2026** — framerwebsites.com/blog/website-design-trends-2026（性能优先、大胆排版、深色默认、功能性微交互）
3. **Web Design Trends 2026: The Definitive Guide** — line25.com/articles/web-design-trends-2026（Bento、超大字体、CSS 滚动驱动动画、claymorphism）
4. **Web Design Trends 2026** — fallingbrick.co.uk/web-design-trends-2023（AI 个性化、微交互、glassmorphism 2.0、可访问性前置）
5. **Best Website Color Palettes for 2026** — colorpickercode.com/blog/best-website-color-palettes-2026（暖大地色回归、严格单色极简、霓虹暗色）
6. **2026 Colours trends for website design** — bespokeuk.com/posts/2026-colours-trends-for-website-design（Cloud Dancer、Mocha Mousse、Mood Mode、Dopamine 色）
7. **2026 Brand Color Trends** — daveyandkrista.com/2026-brand-color-trends（空气感矿物中性、转化青+大地色、软基底+数字亮色）
8. **Personal Websites in 2026: What to Include and What to Skip** — me-page.com/blog/.../personal-websites-in-2026（必备板块、移动优先、该省略什么）
9. **Personal Website Portfolio Best Practices 2026** — calmops.com/career/personal-website-portfolio-best-practices-2026（作品叙事结构、性能/无障碍/SEO）
10. **CSS / JS Animation Trends 2026** — webpeak.org/blog/css-js-animation-trends（微交互、滚动触发、3D/WebGL、性能优先动画）
11. **Micro Animation CSS: Complete Guide (2026)** — dev.to/.../micro-animation-css-complete-guide（hover 卡片上浮、fade-up、骨架屏具体 CSS）
12. **2026 年网页设计趋势（中文）** — brainy.ink/paper/web-design-trends-2026/zh（嵌套 Bento、磁性光标、滚动数字、可变字体品牌化）

---

*军师寄语：趋势是工具不是目的。先想清楚「你是谁、要帮谁、要解决什么」，再让上面这套系统为你服务。拿到这份提示词，任何 AI 都能照着搭出一致、专业、不过时的个人站。* 🍑
