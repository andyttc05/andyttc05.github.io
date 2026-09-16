https://andyttc05.github.io

## 改完代码记得盖章（tools/stamp.mjs）

资源引用的 `?v=` **不是手改的版本号，是那个文件内容的 sha256 前 10 位**。
改完 CSS/JS 之后跑一次：

```bash
node tools/stamp.mjs --write     # 按内容重算所有 ?v=
node tools/stamp.mjs             # 校验：不一致 / 五页启动片段漂移 / 刷新策略跑到别处 → 退出码 1
```

漏了这一步的后果不是"难看"，是**用户拿到旧文件**：URL 没变，浏览器就复用缓存。

它同时守住四件事：`?v=` = 内容哈希 · 加载页三件套每页都在 · 五个页面里那几段启动代码
逐字节相同 · 刷新策略只住在 `assets/js/script.js` 一处。

并行改同一个工作区时，如果某个资源被别人改过但**还没提交**，用
`--head-for=assets/css/style.css` 之类把键按 HEAD 内容算（键要匹配**将要部署**的那份）。

## 刷新行为

刷新（F5 / Cmd+R）= **什么都不做**，滚动位置交给浏览器原生还原（与 ethereum.org 一致）。
唯一的例外是点左上角 logo：那是"刷新界面 = 回正面"，靠一个一次性的 sessionStorage
标志只关掉那一次的原生还原。别在别处再加 `history.scrollRestoration = 'manual'` ——
它是**粘在历史条目上**的，设过一次，这个标签页里后面的每次刷新都不再还原位置。
