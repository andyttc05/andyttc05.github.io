# 蓝图代码片段库(从 homepage.md 提取)

> 从 `homepage.md` 提取的全部代码块,共 **15** 段
> 蓝图里只看「是什么/为什么」,具体实现来这里查。
> 实施时直接复制到 `index.html` / `style.css` / `script.js`。

## 代码片段 #4(原 L218-L264 · plain)

```

### 4.5.2 5 帧猫娘的内容矩阵

| # | 字 | 副文案 | 内嵌互动 | 视觉处理（**AI 图主体 + CSS 包装**）|
|---|----|--------|----------|----------|
| 01 | **落** | 雨滴落下的瞬间，心里也跟着静了 | **🕐 现在 widget** | AI 图·透明伞半身（CSS 加 200 滴加密雨氛围）|
| 02 | **眸** | 第一次抬眼看你，你也在看吗 | **📐 tokens** | AI 图·蓝眸极特写（CSS 加 mix-blend-mode 让瞳色随主题变）|
| 03 | **笑** | 想把今天的云都变成棉花糖送你 | **🎨 主题色切换** ⭐ | AI 图·捧云微笑 + CSS 6 大色块 + 弧形笑颜 |
| 04 | **歌** | 走在路上，嘴里哼着没名字的调 | **✨ 5 项动效 mini demo** | AI 图·哼歌侧脸 + CSS 跳动音符 ♪♫♩ |
| 05 | **触** | 伸出手，想碰一下，又缩回来 | **📮 联系** | AI 图·伸手向 viewer + CSS 联系圆点 |

**关键：每张 slide 角落的"小互动"不抢戏**——巨字始终是视觉主角,小互动是"彩蛋"。

### 4.5.3 5 帧 AI 图嵌入方式(**图片主体 + CSS 包装**)

> **结构原则**:5 帧 AI 图负责"感人",CSS 负责"高级"。图片在 slide 视觉层(右下/左下角,占 40% 区域),巨字在前景中央(200px,占 50% 区域)。

#### 4.5.3.1 通用 HTML 结构

📋 *代码片段见 `code-snippets.md` § #2*
<article class="slide" data-slide="0" aria-label="N° 01 / 05:落(雨滴落下的瞬间,心里也跟着静了)">
  <span class="slide-num">N° 01</span>

  <!-- 前景:巨字 + 副文案 -->
  <h2 class="slide-title">落</h2>
  <p class="slide-sub">「雨滴落下的瞬间,心里也跟着静了」</p>

  <!-- 背景:AI 图(picture + 4 尺寸 webp) -->
  <picture class="slide-visual" aria-hidden="true">
    <source srcset="assets/images/frame-01-luo-320.webp 320w,
                     assets/images/frame-01-luo-480.webp 480w,
                     assets/images/frame-01-luo-720.webp 720w,
                     assets/images/frame-01-luo-1024.webp 1024w"
            sizes="(max-width: 768px) 60vw, 40vw"
            type="image/webp">
    <img src="assets/images/frame-01-luo-720.webp"
         alt=""
         loading="lazy"
         decoding="async"
         width="720" height="960">
  </picture>

  <!-- 角落互动 widget(具体内容见 §6.6-6.11) -->
  <aside class="slide-wiget">...</aside>
</article>
```

## 代码片段 #5(原 L303-L322 · plain)

```

#### 4.5.3.3 02 眸的特别处理(联动 ② 主题色跟随)

📋 *代码片段见 `code-snippets.md` § #4*
/* AI 图里蓝色瞳孔区域会被 mix-blend-mode 影响 */
/* 主题色变蓝/紫/粉时,自动跟随 */
.slide[data-slide="1"] .slide-visual {
  transition: filter 0.4s ease;
}
.slide[data-slide="1"] .slide-visual img {
  /* 关键:用 CSS filter hue-rotate 模拟瞳孔换色 */
  filter: hue-rotate(0deg) saturate(1);
  transition: filter 0.4s ease;
}
/* 当主题色变化时,JS 触发 class 来调 hue-rotate */
.slide[data-slide="1"] .slide-visual.eye-accent img {
  filter: hue-rotate(var(--accent-hue, 0deg)) saturate(1.1);
}
```

## 代码片段 #6(原 L334-L361 · plain)

```

📋 *代码片段见 `code-snippets.md` § #6*
.music-notes {
  position: absolute;
  top: 12%; right: 8%;
  display: flex; gap: 1.2rem;
  font-size: 2.4rem;
  color: var(--color-accent);
  opacity: 0.85;
  pointer-events: none;
  z-index: 2;
}
.note { display: inline-block; animation: note-float 3s ease-in-out infinite; }
.note.n1 { animation-delay: 0s; }
.note.n2 { animation-delay: 0.4s; }
.note.n3 { animation-delay: 0.8s; }
.note.n4 { animation-delay: 1.2s; }
.note.n5 { animation-delay: 1.6s; }
@keyframes note-float {
  0%, 100% { transform: translateY(0) rotate(-3deg); }
  50%      { transform: translateY(-12px) rotate(3deg); }
}
/* 联动 ② 主题色变 → 音符色自动跟随(用 CSS variable) */
.music-notes { color: var(--color-accent); }
/* 联动 ② 触发音符 mini demo 时,加速 */
.music-notes.boost .note { animation-duration: 0.6s; }
```

## 代码片段 #7(原 L374-L385 · plain)

```

📋 *代码片段见 `code-snippets.md` § #8*
.smile-arc {
  position: absolute;
  top: 8%; left: 50%;
  transform: translateX(-50%);
  width: 200px; height: 100px;
  opacity: 0.12;  /* 弱化,不抢 AI 图戏 */
  z-index: -1;
}
```

## 代码片段 #8(原 L438-L475 · plain)

```

### 4.5.5 5 帧的 4 个"萌点"细节（**AI 图 + CSS 混合**）

- **副文案是诗**：每张 slide 的副文案不是设计概念,是**有情感的句子**("心里也跟着静了"/"你也在看吗")
- **AI 蓝眸极特写**（02 眸）:AI 图占 slide 居中 60% 区域,scale 1.2,联动 ② 主题色变 → 瞳色用 `hue-rotate` 跟随
- **弧形笑颜**（03 笑）:AI 捧云图周围一条淡淡 SVG 弧线(opacity 0.12,不抢图)
- **跳动音符**（04 歌）:5 个 ♪♫♩ 用 CSS 错峰浮动(联动 ② 主题色变 → 音符色变)
- **犹豫虚线**（05 触）:AI 伸手图 + 腕部 SVG 虚线 = "想碰又缩回来"(CSS 后期补)

### 4.5.6 视觉冲击的关键

- **巨字**:`clamp(80px, 14vw, 200px)` —— **必须大**
- **AI 图 + 巨字双主角**:图占 40-50% 区域(z-index 0),巨字占 50-60% 区域(z-index 1)
- **mix-blend-mode: multiply**:让 AI 图的浅蓝底融进 slide 背景,看起来更整体
- **drop-shadow 微滤镜**:`filter: drop-shadow(0 20px 40px rgba(15, 23, 42, 0.08))` 让图有轻盈悬浮感
- **配色对比**:slide 之间的氛围色要有差异(slide 1 冷色雨 / slide 2 蓝眸 / slide 3 彩色块 / slide 4 暖黄 / slide 5 主题色)
- **节奏**:每张 100vh,**5 张 = 5 个 viewport**,不能短

### 4.5.7 无障碍

- `prefers-reduced-motion`：关闭所有入场动画 + 关闭 wheel→horizontal
- 键盘左右键仍可用
- 每张 slide 有 `aria-label="N° 01 / 05：落（雨滴落下的瞬间……）"`
- CSS 视觉元素全部 `aria-hidden="true"`（装饰用，不被读屏）
- 角落 widgets 标记 `aria-live="polite"`


### 4.5.8 5 帧联动设计（**all-in 5 项** · 总工时 8-12h）

> **核心原则**：5 帧不是 5 个孤岛,而是 1 个连续体验。下面 5 项联动让访客"感觉在读 1 句话,不是看 5 张图"。

#### 联动 ① 猫娘姿态连贯（叙事联动 · 出图时控 · 0h 额外）

**目的**:5 张 AI 图的姿态连成一条动作弧,让访客感觉在看"5 帧 GIF 关键帧"而不是 5 张独立海报。

**姿态弧**:
```

## 代码片段 #11(原 L519-L532 · plain)

```

**实现**:
- 1 个 `<canvas id="bg-particles">` 固定定位
- 粒子有 `phase` 属性(0-1),随 `animation-timeline: scroll()` 变化
- `phase < 0.2` → 雨丝;`0.2-0.4` → 光斑;`0.4-0.6` → 云朵;`0.6-0.8` → 音符;`0.8-1.0` → 指尖光
- 用 SVG 形态路径做插值

#### 联动 ④ 巨字字符级转场（视觉冲击最强 · 4-6h）

**目的**:slide 切换时,巨字"落/眸/笑/歌/触"不是瞬间换,而是**字符级变形动画** —— 哇哦时刻。

**转场序列**:
```

## 代码片段 #12(原 L537-L572 · plain)

```

**实现**:
- 用 SVG `clip-path` + CSS `clip-path: path()` 做字符级动画
- 每个字 4 帧关键帧:`from 形态 → 过渡 30% → 过渡 70% → to 形态`
- 5 张 slide 都有同样的 `<span class="giant">字</span>` 容器,滚动时通过 `view-transition` API 或自写 JS 切换 path
- 降级:不支持 `view-transition` 时,fallback 到 opacity 渐变

**性能考虑**:
- 用 `will-change: clip-path` 提示
- `transform: translateZ(0)` 启用 GPU
- 移动端检测 `prefers-reduced-motion`,降级为瞬切

#### 联动 ⑤ 进度累积（轻联动 · 30min）

**目的**:用户有"完成度"动力,愿意看完 5 张。

**视觉**:
- 顶部 nav 下方一条**细进度条**(2px 高),`width: var(--progress)`,值 0-100%
- 进度 = `已访问 slide 数 / 5 × 100%`
- 每访问一张,该格的 dot 从灰变实心 + 标号高亮
- 5/5 时,整条进度条轻微"完成"动效(亮度 +20% 持续 0.6s 后回落),触发一次性微动效

**实现**:
📋 *代码片段见 `code-snippets.md` § #10*
<div class="slide-progress" aria-hidden="true">
  <div class="slide-progress-bar"></div>
  <div class="slide-progress-dots">
    <span class="dot" data-for="0"></span>
    <span class="dot" data-for="1"></span>
    <span class="dot" data-for="2"></span>
    <span class="dot" data-for="3"></span>
    <span class="dot" data-for="4"></span>
  </div>
</div>
```

## 代码片段 #13(原 L591-L665 · plain)

```

#### 联动效果优先级

| 联动 | 视觉冲击 | 性能开销 | 实现难度 | 总评 |
|------|----------|----------|----------|------|
| ① 姿态连贯 | ⭐⭐⭐⭐ | 0 | prompt 控制 | 必做(0 成本) |
| ⑤ 进度累积 | ⭐⭐⭐ | <1KB JS | 低 | 必做(30min) |
| ② 状态回响 | ⭐⭐⭐⭐ | <1KB JS | 中 | 推荐(2-3h) |
| ③ 共享背景 | ⭐⭐⭐ | ~3KB JS | 中 | 推荐(1-2h) |
| ④ 巨字转场 | ⭐⭐⭐⭐⭐ | ~4KB JS | 高 | 高级(4-6h) |

**总工时估算**:① 0h + ② 2-3h + ③ 1-2h + ④ 4-6h + ⑤ 0.5h = **8-12h**


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
> - 实施 8 步骤 §8 #2(出 5 帧 AI 图)时 → 主人按文件执行


## 6. 互动玩法（5 页面级 + 4 融入 slide）

> 主页 = **2 段**（Hero + 5 slides）。所有互动要么自动跑（5 项页面级），要么藏在 slide 角落（4 项融入 slide）。
> **总数 9 项**（V6.1 是 11 项，删了 playground 后减 2）。

### 6.0 总览

| # | 名称 | 分类 | 位置 | 技术栈 | JS |
|---|------|------|------|--------|-----|
| 6.1 | 🌧️ 细雨 canvas | 页面级 | 全站 | Canvas + rAF | ~80 |
| 6.2 | ⌨️ 打字机 | 页面级 | Hero | setTimeout | ~20 |
| 6.3 | 💧 点击涟漪 | 页面级 | 全站 | CSS 动画 | ~10 |
| 6.4 | 🎯 Hero 视差 | 页面级 | Hero | **CSS** `animation-timeline: scroll()` | **0** |
| 6.5 | 📊 阅读进度条 | 页面级 | nav 下 | **CSS** `animation-timeline: scroll()` | **0** |
| 6.6 | 🕐 现在 widget | 融入 slide | Slide 01 角落 | rAF + setInterval | ~15 |
| 6.7 | 📐 tokens 显示 | 融入 slide | Slide 02 角落 | Clipboard API | ~10 |
| 6.8 | 🎨 主题色切换 | 融入 slide | **Slide 03 主场** | localStorage + 颜色过渡 | ~15 |
| 6.9 | ✨ 5 项动效 demo | 融入 slide | **Slide 04 主场** | 各 demo 复用 6.1-6.5 | ~30 |

**JS 总增量**：~180 行 ≈ ~6KB（细雨是大头）。
**统一无障碍**：全部 9 项检测 `prefers-reduced-motion`。

> **注**：联系信息（GitHub / Email）合入 Slide 05「链」的设计中，不再单列。

**JS 总增量**：~180 行 ≈ ~6KB（细雨是大头）。
**统一无障碍**：全部 9 项检测 `prefers-reduced-motion`。

### 6.1-6.5（页面级）— 沿用 V5 实现

实现细节与 V5 几乎一致，参见 `附录 A.1-A.5`。**微调点**：
- 6.4 视差：avatar 改右方后，3 层（avatar/title/tagline）依然成立，速度系数 `0.3 / 0.5 / 0.7` 不变
- 6.5 进度条：进度条颜色用 `--color-accent`，所以**主题色切换**时会同步变色（自动）

### 6.6 🕐 现在 widget（**融入 Slide 01 角落**）

📋 *代码片段见 `code-snippets.md` § #12*
<!-- 放在 .slide[data-slide="0"] 角落 -->
<aside class="slide-wiget now-widget" aria-live="polite">
  <span class="now-time">--:--:--</span> · 📍 上海 · ⌨️ 写 C++ 中
</aside>
```

## 代码片段 #14(原 L677-L689 · plain)

```

📋 *代码片段见 `code-snippets.md` § #14*
.now-widget {
  position: absolute;
  bottom: 24px; right: 32px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 13px;
  color: var(--color-muted);
  letter-spacing: 0.5px;
  opacity: 0.7;
}
```

## 代码片段 #15(原 L700-L710 · plain)

```

📋 *代码片段见 `code-snippets.md` § #16*
document.querySelectorAll('.tokens-list code').forEach(el => {
  el.addEventListener('click', () => {
    navigator.clipboard.writeText(el.dataset.token);
    el.classList.add('copied');
    setTimeout(() => el.classList.remove('copied'), 1200);
  });
});
```

## 代码片段 #16(原 L725-L739 · plain)

```

### 6.8 🎨 主题色切换（**融入 Slide 03 · 主场**）

📋 *代码片段见 `code-snippets.md` § #18*
<!-- 放在 .slide[data-slide="2"]，6 个大色块占满 2×3 整屏 -->
<div class="accent-picker">
  <button style="background:#2563eb" data-value="#2563eb" data-rgb="37,99,235"></button>
  <button style="background:#7c3aed" data-value="#7c3aed" data-rgb="124,58,237"></button>
  <button style="background:#db2777" data-value="#db2777" data-rgb="219,39,119"></button>
  <button style="background:#dc2626" data-value="#dc2626" data-rgb="220,38,38"></button>
  <button style="background:#ea580c" data-value="#ea580c" data-rgb="234,88,12"></button>
  <button style="background:#0d9488" data-value="#0d9488" data-rgb="13,148,136"></button>
</div>
```

## 代码片段 #17(原 L758-L777 · plain)

```

📋 *代码片段见 `code-snippets.md` § #20*
function setAccent(value, rgb, btn) {
  const root = document.documentElement;
  root.style.setProperty('--color-accent', value);
  root.style.setProperty('--color-accent-rgb', rgb);
  document.querySelectorAll('.accent-picker button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  try { localStorage.setItem('rainmeow-accent', JSON.stringify({ value, rgb })); } catch {}
}
document.querySelectorAll('.accent-picker button').forEach(btn => {
  btn.addEventListener('click', () => setAccent(btn.dataset.value, btn.dataset.rgb, btn));
});
// 启动：恢复上次选择
try {
  const saved = JSON.parse(localStorage.getItem('rainmeow-accent'));
  if (saved) document.querySelector(`.accent-picker button[data-value="${saved.value}"]`)?.click();
} catch {}
```

## 代码片段 #18(原 L792-L815 · plain)

```

📋 *代码片段见 `code-snippets.md` § #22*
.mini-demos {
  position: absolute;
  bottom: 80px; left: 50%;
  transform: translateX(-50%);
  display: flex; gap: 16px;
}
.mini-demo {
  width: 100px; height: 100px;
  border: 1px solid var(--color-rule);
  border-radius: 12px;
  background: var(--color-paper);
  cursor: pointer;
  font-size: 24px;
  transition: transform .2s, border-color .2s;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 4px;
}
.mini-demo small { font-size: 11px; color: var(--color-muted); }
.mini-demo:hover { transform: translateY(-4px); border-color: var(--color-accent); }
```

## 代码片段 #19(原 L829-L858 · plain)

```

### 6.10 🎬 滑动展示容器（见 §4.5 详细设计 + 附录 A.9）

实现要点：
- 横向 `scroll-snap-type: x mandatory`，每张全宽 flex
- 滚轮事件转横向（`passive: false`）
- IntersectionObserver 同步 indicator 数字
- CSS `animation-timeline: view(inline)` 让每张 slide 内部元素错峰 fade-up
- `prefers-reduced-motion` 关闭 wheel→horizontal

### 6.11 📮 联系（**融入 Slide 05**）

📋 *代码片段见 `code-snippets.md` § #24*
<!-- 放在 .slide[data-slide="4"]，3 大圆点水平排开 -->
<div class="contact-circles">
  <a class="contact-circle" href="https://github.com/andyttc05" target="_blank">
    <span class="contact-label">GitHub</span>
    <span class="contact-value">@andyttc05</span>
  </a>
  <button class="contact-circle" data-copy="andyttc2463@gmail.com">
    <span class="contact-label">Email</span>
    <span class="contact-value">点击复制</span>
  </button>
  <a class="contact-circle" href="https://twitter.com/..." target="_blank" hidden>
    <span class="contact-label">Twitter</span>
    <span class="contact-value">@rainmeow</span>
  </a>
</div>
```

## 代码片段 #20(原 L887-L903 · plain)

```

📋 *代码片段见 `code-snippets.md` § #26*
document.querySelectorAll('.contact-circle[data-copy]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const text = btn.dataset.copy;
    try { await navigator.clipboard.writeText(text); } catch {}
    btn.classList.add('copied');
    const orig = btn.querySelector('.contact-value').textContent;
    btn.querySelector('.contact-value').textContent = '已复制';
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.querySelector('.contact-value').textContent = orig;
    }, 1500);
  });
});
```

## 代码片段 #21 · ripple-distortion.js 完整实现(设计区涟漪)

> **来源**:reactbits.dev RippleDistortion 组件(React + ogl)
> **改造**:vanilla JS 重写,适配静态站;GLSL shader 原样复用
> **位置**:从 `/.blueprint/` 移出,实施时放到项目根 `ripple-distortion.js`
> **依赖**:ogl 1.0.11 从 CDN 加载(`https://cdn.jsdelivr.net/npm/ogl@1.0.11/dist/ogl.umd.js`)
> **总行数**:~330 行(含 GLSL shader + vanilla 重写逻辑)

### HTML 用法示例

```html
<!-- 加载 ogl CDN + ripple 组件 -->
<script src="https://cdn.jsdelivr.net/npm/ogl@1.0.11/dist/ogl.umd.js"></script>
<script src="ripple-distortion.js" defer></script>

<!-- 涟漪挂载点(在设计区里) -->
<div class="ripple-mount"
     data-src="assets/design/rain-bg.webp"
     data-strength="0.25"
     data-swirl="1.5"
     data-rings="4"
     data-grayscale="true"
     data-tint="#a855f7"
     data-trigger="both">
</div>
```

### data-* 属性(对应 React props)

| data 属性 | 类型 | 默认 | 说明 |
|-----------|------|------|------|
| `data-src` | string | unsplash 示例图 | 图像 URL(cover fitted) |
| `data-brush-size` | number | 150 | 每个涟漪直径(px) |
| `data-strength` | number | 0.2 | 推力强度(0-1) |
| `data-swirl` | number | 1 | 推力方向的旋涡(0=平,>1=caustics) |
| `data-rings` | number | 4 | 每个涟漪的同心波数(0=单一圆斑) |
| `data-spread` | number | 5 | 涟漪扩散到几倍自身大小后消亡 |
| `data-fade` | number | 3 | 涟漪存活时间(秒) |
| `data-spacing` | number | 15 | 鼠标移动多少 px 产生 1 个涟漪 |
| `data-dispersion` | number | 0 | 通道色散(R/B 分离) |
| `data-glint` | number | 0 | 波峰光泽 |
| `data-tint` | string | #a855f7 | 染色 |
| `data-tint-amount` | number | 0.1 | 染色强度 |
| `data-highlight-color` | string | #ffffff | 光泽颜色 |
| `data-grayscale` | boolean | true | 灰度(让涟漪在色调上更明显) |
| `data-trigger` | 'hover'/'click'/'both' | both | 触发方式 |
| `data-click-strength` | number | 2 | 点击涟漪比 hover 强几倍 |
| `data-quality` | 'low'/'medium'/'high' | low | 位移 buffer 分辨率 |

### 完整 JS 实现

> 实施时从本文件 `code-snippets.md` 复制完整代码到 `ripple-distortion.js`

