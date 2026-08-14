# 5 帧猫娘分镜 · AI 出图提示词 **v2**

> 用途:用户拿去 SD / Midjourney 出图
> 角色:rain.meow · 银白长发冰蓝眸猫娘 · 白水手服蓝蝴蝶结
> 风格:统一用 SDXL (AnimagineXL / AnythingXL) 或 MJ niji 6
> 背景:浅蓝 #dbeafe 单色(抠图友好)
> 出图尺寸:512×768(半身)/ 512×512(方形/特写)→ 后期 2x upscale
> **变更**:v2 修 P1-P8 + Q1(音符 CSS 后加)+ Q2(02 眸眼动方向取代 head↑)

---

## 🔒 通用规则(5 张共用)

### 角色描述(Positive 前缀 · v2 加细节)

```
1girl, solo, cat ears, cat tail,
long waist-length silver-white hair with soft side bangs and subtle blue tint,
ice-blue eyes, white eyelashes, cute kawaii style,
white cat ears with pink inner ear,
fluffy white cat tail with blue tip,
wearing a white sailor seifuku top with blue collar stripe,
oversized blue ribbon bow tie on chest,
soft cool-toned cheeks, anime style, masterpiece, best quality,
highly detailed face, soft pastel blue and white color palette
```

### 角色一致性约束(联动 ① 必加 · v2 改 Q2)

```
character consistency: same girl across all 5 frames,
upper body stays in same position relative to camera,
only the head, expression, and arm pose changes between frames,
keep same lighting direction, same white sailor uniform, same blue ribbon
```

> **Q2 修复**:02 眸的姿态弧不再描述 `head↑`,改为 `eye gaze direction(eye contact with viewer)`,因为极特写没头。

### Negative 通用(v2 加 P6 背景清理)

```
background, scenery, environment, buildings, multiple girls, extra limbs,
bad hands, mutated fingers, watermark, signature, text, low quality, blurry,
nsfw, bad anatomy, extra arms, extra legs, fused fingers,
gradient background, complex background, detailed background,
light effects, bokeh, vignette, shadows on background
```

### 背景设定(抠图友好 · v2 加强)

```
simple flat color background, solid light blue #dbeafe, no scenery, no details
```

### 工具备注

- **SD 用户**:换 transparent VAE(checkpoint 选 Anything / Counterfeit / Animagine)
- **MJ 用户**:MJ 出不了真透明,先出浅蓝 #dbeafe 底,后期 remove.bg 抠
- **共性**:5 张必须用**同一个 checkpoint + 同一个 lora**,脸/发色/瞳色才一致

---

## 🎬 5 帧完整 Prompt

### N°01 · 落(撑伞静立)

| 项 | 内容 |
|----|------|
| **主题** | 雨落静心 |
| **姿态弧位置** | 低头(head↓)、眼低(eyes↓)、伞在上方 |
| **构图** | 半身正面,猫娘居中,透明伞在头部上方,雨滴落在头发 |
| **完整 prompt** | `{角色前缀} {一致性约束} holding a see-through transparent umbrella above head, water drops on silver hair and umbrella surface, peaceful calm expression, eyes looking down at the rain, head slightly bowed, upper body portrait {背景: 浅蓝单色}` |
| **SD 参数** | Steps 30, CFG 7, Euler a, 512×768, hires-fix 2x |
| **MJ 参数** | `--ar 3:4 --niji 6 --style cute --q 2` |
| **Negative 追加(P2)** | `looking at viewer, eye contact, smile, open mouth`(强制低头、不对视、不笑)|
| **抠图注意** | 伞边缘雨丝会带半透明,用 remove.bg "前景保留" 模式 |

### N°02 · 眸(蓝眸特写)

| 项 | 内容 |
|----|------|
| **主题** | 第一次抬眼看你 |
| **姿态弧位置(Q2 改)** | 单只眼睛占画面 60-70%,眼动方向 = **eye contact with viewer** |
| **构图** | 极特写,1 只冰蓝眸占主体,眉毛/脸颊边缘入画 |
| **完整 prompt** | `{角色前缀} {一致性约束} extreme close-up of single ice-blue eye filling 60 percent of frame, detailed iris with light reflection and star sparkle, silver eyelash, pink soft eyelid, eye contact with viewer, eyebrow and cheek edge visible {背景: 浅蓝单色}` |
| **SD 参数(P7 改)** | Steps 35, CFG 8, 512×512, **clipped-space 0.05** 强约束特写 |
| **MJ 参数** | `--ar 1:1 --niji 6 --q 2 --zoom 1.5` |
| **Negative 追加(P7)** | `full body, full face, multiple eyes, both eyes, full head, hair covering face, portrait, upper body` |
| **抠图注意** | 容易画成整张脸,**出 15+ 张选最特写的 1 张**;后期可裁剪到眼部 |

### N°03 · 笑(捧云微笑)

| 项 | 内容 |
|----|------|
| **主题** | 想把今天的云都变成棉花糖送你 |
| **姿态弧位置** | 头正、口角上扬、双手在胸前捧物(微前倾)|
| **构图** | 中景,猫娘正面,双手捧一团粉/白棉花糖在胸前,身体略前倾 |
| **完整 prompt(P3 改)** | `{角色前缀} {一致性约束} holding fluffy pink and white cotton candy shaped like a small cloud with both hands close to chest, gentle warm smile with mouth corners turned up, eyes closed happily in a crescent shape, upper body slightly leaning forward, upper body portrait {背景: 浅蓝单色}` |
| **SD 参数(P3 改)** | Steps 30, CFG 7, 512×768, hires-fix 2x |
| **MJ 参数** | `--ar 3:4 --niji 6 --style cute --q 2` |
| **Negative 追加(P3)** | `extra fingers, three hands, asymmetric hands, mutated hands, bad hands, presenting forward, extending arms` |
| **抠图注意** | 双手捧物手部翻车重灾区,**出 15+ 张选 1**;棉花糖和手之间的小缝隙要细抠 |

### N°04 · 歌(哼歌漫步)

| 项 | 内容 |
|----|------|
| **主题** | 走在路上,嘴里哼着没名字的调 |
| **姿态弧位置** | 头微侧(↘)、眼半闭、嘴微张 |
| **构图** | 半身,猫娘 3/4 侧脸,嘴微张,2-3 个简单音符散落头部周围 |
| **完整 prompt(P4 改)** | `{角色前缀} {一致性约束} mouth slightly open as if humming a soft tune, eyes half-closed with peaceful expression, head tilted slightly to the right, three-quarter side view, dreamy soft expression, upper body portrait {背景: 浅蓝单色}` |
| **SD 参数** | Steps 30, CFG 7, 512×768 |
| **MJ 参数** | `--ar 3:4 --niji 6 --style cute --q 2` |
| **Negative 追加** | `eyes wide open, full smile, profile view, profile face, harsh expression, music notes, musical symbols`(Q1 音符让 CSS 加,prompt 不画)|
| **抠图注意** | 不画音符(改 CSS),所以不用抠音符;只抠猫娘主体 |

> **Q1 决策**:音符让 CSS 后加,5 个 `<span class="note">♪</span>♫♩` 浮动在画面右上,联动 ④ 触发时跳动。比让 AI 画稳 10 倍。

### N°05 · 触(伸手向 viewer)

| 项 | 内容 |
|----|------|
| **主题** | 伸出手,想碰一下,又缩回来 |
| **姿态弧位置** | 单手从画面右下伸出,手指微曲,掌心朝 viewer |
| **构图** | 手部+前臂特写,占画面 50-60%,从画面右下角伸入,指尖朝向 viewer |
| **完整 prompt(P8 删)** | `{角色前缀} {一致性约束} one hand reaching toward viewer from lower right corner, fingers slightly curled in shy gesture, palm facing camera at gentle angle, foreshortened arm with white sleeve, blue ribbon at wrist, soft cool light on fingertips, sharp focus on hand {背景: 浅蓝单色}` |
| **SD 参数(P5 改)** | Steps **40**, CFG 8, 512×512, hires-fix 2x(手部需要更多 step)|
| **MJ 参数** | `--ar 1:1 --niji 6 --q 2` |
| **Negative 追加(P5 强化)** | `extra fingers, six fingers, seven fingers, mutated hands, both hands, two hands, deformed fingers, missing fingers, closed fist, hand in pocket, two hands, second hand` |
| **抠图注意** | **手部是出图翻车重灾区,出 20+ 张选 1**;腕部虚线/袖子边缘后期用 CSS 加 |

---

## 🎵 联动 ④ 音符 CSS 实现(替代 AI 出音符)

> Q1 决策:音符让 CSS 加,不再让 AI 画。

```html
<!-- 放在 .slide[data-slide="3"] 内部右上角 -->
<div class="music-notes" aria-hidden="true">
  <span class="note n1">♪</span>
  <span class="note n2">♫</span>
  <span class="note n3">♩</span>
  <span class="note n4">♪</span>
  <span class="note n5">♫</span>
</div>
```

```css
.music-notes {
  position: absolute;
  top: 12%; right: 8%;
  display: flex; gap: 1.2rem;
  font-size: 2.4rem;
  color: var(--color-accent);
  opacity: 0.85;
  pointer-events: none;
}
.note {
  display: inline-block;
  animation: note-float 3s ease-in-out infinite;
}
.note.n1 { animation-delay: 0s; }
.note.n2 { animation-delay: 0.4s; }
.note.n3 { animation-delay: 0.8s; }
.note.n4 { animation-delay: 1.2s; }
.note.n5 { animation-delay: 1.6s; }

@keyframes note-float {
  0%, 100% { transform: translateY(0) rotate(-3deg); }
  50%      { transform: translateY(-12px) rotate(3deg); }
}

/* 联动 ② 触发:Slide 04 mini demo 点击时,音符整体加速 */
.music-notes.boost .note { animation-duration: 0.6s; }
```

**优势**:
- 5 个音符错峰跳,自带节奏感
- 联动 ② 状态回响(主题色变 → 音符色变)+ 联动 ④ 巨字转场(触发音符 → 雨滴同步)都能用 CSS 实现
- 不用为音符翻车担心

---

## 🛠 出图 → 抠图 → 入站 全流程

1. **统一 Lora / checkpoint** — 5 张必须用同一个模型 + 同一个 lora,保证脸/发色/瞳色一致
2. **批量出图(v2 调整数量)**:
   - 01 落:8-10 张选 1
   - 02 眸:15+ 张选 1(极特写翻车率高)
   - 03 笑:15+ 张选 1(双手翻车率高)
   - 04 歌:8-10 张选 1(最简单)
   - 05 触:**20+ 张选 1**(手部翻车重灾区)
3. **后期处理**(免费工具):
   - 抠图:[remove.bg](https://remove.bg) 或 [Photopea](https://photopea.com) 魔棒
   - 调色:Photopea 统一亮度/对比度,5 张看起来像"同一天拍的"
   - 裁剪:02 眸和 05 触可能需要二次裁剪到目标构图
4. **存为 webp**,5 帧用 4 个尺寸(320/480/720/1024),每帧文件名:
   ```
   /assets/images/frame-01-luo-{320,480,720,1024}.webp
   /assets/images/frame-02-mou-{320,480,720,1024}.webp
   /assets/images/frame-03-xiao-{320,480,720,1024}.webp
   /assets/images/frame-04-ge-{320,480,720,1024}.webp
   /assets/images/frame-05-chu-{320,480,720,1024}.webp
   ```
5. **CSS 嵌入方式**(等图到位后):
   - 巨字"落/眸/笑/歌/触"在前景中央,200px
   - 5 帧 AI 图在 slide 视觉层,`mix-blend-mode: multiply` 让浅蓝底融进 slide
   - 或直接当 `<img>` 居中,`max-height: 80vh`
   - 巨字与图的位置:图占右下/左下角(留 50% 给巨字)
   - **05 触的留白由 CSS 处理**(因为 prompt 已删 "empty space" 描述,AI 会画满)

---

## ✅ 质量自检 Checklist

出图后,5 张都应该满足:

- [ ] 同一只猫娘(脸型 / 发色 / 瞳色一致)
- [ ] 同一件白水手服 + 同一位置蓝蝴蝶结
- [ ] 同一光照方向(都从左上来)
- [ ] 同一画风(不要某张突然变写实)
- [ ] 背景纯净(单色或透明,无杂物 / 无渐变 / 无 bokeh)
- [ ] 姿态弧连贯(低头 → 眼动看 viewer → 笑 → 侧头哼 → 伸手)
- [ ] 4 尺寸 webp 全部生成
- [ ] 抠图后边缘干净(无白边/黑边/锯齿)
- [ ] 整体亮度/对比度统一

---

## 📋 v1 → v2 变更摘要

| 编号 | 问题 | v1 状态 | v2 修复 |
|------|------|---------|---------|
| P1 | 角色前缀特征不够具体 | 模糊 | 加冰蓝瞳/银白长发/白猫耳粉内耳/白蓬松尾巴蓝尖 |
| P2 | 01 落 vs 姿态弧冲突 | looking at viewer | 改 eyes looking down at the rain,head slightly bowed + Negative 强制不 eye contact |
| P3 | 03 笑 手部描述矛盾 | holding + presenting forward | 改 close to chest + slightly leaning forward + Negative 强化 |
| P4 | 04 歌 音符 SD 无法识别 | Unicode 符号 | **CSS 后加**(Q1)|
| P5 | 05 触 出图数量不足 | 10+ 张 | **20+ 张** + SD steps 30→40 + Negative 强化 |
| P6 | 背景不够纯 | simple + flat | Negative 加 gradient / complex / bokeh / vignette 等 |
| P7 | 02 眸 翻车率被低估 | 8-10 张 | **15+ 张** + Negative 加 full body / full face 等 |
| P8 | 05 触 有合成提示 | empty space 描述 | **删除**(由 CSS 处理留白)|
| Q1 | 音符要不要 AI 画 | - | **CSS 后加**(5 个 span 错峰跳)|
| Q2 | 02 眸 姿态弧 head↑ | head↑ | 改 **eye gaze direction** |
