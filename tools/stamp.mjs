#!/usr/bin/env node
/* 站点一致性盖章器 / 校验器 —— 2026-09-16（第一百八十三批）
 *
 * 为什么需要它：这个站是纯静态手写页，没有构建步骤，于是「五页必须一致」的东西
 * （资源缓存键、启动片段、刷新策略）全靠人手改五遍。历史上已经翻车过两次：
 *   78cba53  nav: one style.css cache key for every page, again
 *   0a09db5  projects: bump the css/js keys so the new pin actually reaches visitors
 * 一次性差异的代价不是难看，是**功能**：`style.css?v=` 一裂开，跨过那个"异类页"
 * 就是缓存未命中 ⇒ 引擎 Transition was skipped ⇒ 用户看到硬切（见 REF-site.md）。
 *
 * 所以把「一致」变成可以被机器判定的东西：
 *   ① KEY      每个 ?v= 必须等于**该文件内容的 sha256 前 10 位**（＝内容寻址）。
 *              改一个字键就变，不存在"忘了 bump"；五页读同一份文件 ⇒ 天然同值。
 *   ② PRESENCE 加载页三件套（loader.css / loader.js + 各自的启动片段）每页都必须在。
 *   ③ SNIPPET  必须逐字节相同的启动片段：nav-instant 判定 / speculationrules /
 *              load+2s 兜底。（比的是**去注释去空白**后的代码。）
 *   ④ ONE-PLACE 刷新策略只许出现在 assets/js/script.js 一处；HTML 里不许有
 *              刷新/滚动恢复相关代码。
 *   ⑤ CURTAIN  加载幕布（#pageLoader）还在、还能露脸。主人 2026-09-16 原话：
 *              「过渡幕布不要删，这个我网页的设计特色」—— 但幕布**更容易死于"优化"
 *              而不是死于删除**（把露出阈值调大 = 等于删掉），所以这里判的是四条
 *              硬指标，不是"文件在不在"。
 *
 * 用法：
 *   node tools/stamp.mjs            # 校验（默认），有漂移则退出码 1
 *   node tools/stamp.mjs --write    # 把 ?v= 全部改写成当前内容哈希
 *   node tools/stamp.mjs --json     # 只输出机器可读结果
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

/* 仓库根：默认 = 本文件上一级。`--root=<dir>` 可以指向一份副本 —— 反证夹具
   （nav-perf/stamp-fixture.js）靠它把"改坏一份副本再跑"做成自动的。
   ⚠️ 这个参数以前写在文档里但**没实现**，被静默忽略；夹具之所以还能跑，是因为它
   调的是副本里的 tools/stamp.mjs（import.meta.url 自己就指向副本）。
   那种"参数被吃掉但看起来正常"正是本项目反复踩的坑，所以补上。 */
const ROOT_ARG = (process.argv.find((a) => a.startsWith('--root=')) || '').split('=')[1];
const ROOT = ROOT_ARG ? resolve(ROOT_ARG) : resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const JSON_ONLY = process.argv.includes('--json');
const VERBOSE = process.argv.includes('--verbose');

/* 手写的正式页。顺序固定，报告里好对。
   ⚠️ 单册页（pages/albums/<slug>.html）**不在**这里 —— 它们是 tools/photos-data.py 从
   pages/album.html 生成的，数量随相簿增减，所以下面按数据文件里的 slug 算出来。 */
const FIXED_PAGES = [
  'index.html',
  'pages/about.html',
  'pages/projects.html',
  'pages/posts.html',
  'pages/photos.html',
  'pages/album.html',
  'pages/coming-soon.html',
];

/* 每页必须在场的共享资源（＝加载页 / 刷新行为的地基）。 */
const MUST_HAVE = ['assets/css/fonts.css', 'assets/css/loader.css', 'assets/js/loader.js'];

/* 已知且**有理由**的差异，不报红，但每次都打出来提醒。 */
const KNOWN_DEVIATIONS = {
  'assets/css/style.css': 'pages/coming-soon.html 故意不引 —— 它自带配色 tokens（移植规范）',
  'assets/js/script.js': 'pages/coming-soon.html 故意不引 —— 无导航无滚动，自包含 splash',
  'inline-pageLoader-style': 'coming-soon 不引 style.css，所以把 tokens 内联进了同一段 <style>',
};

const problems = [];
const notes = [];
const fail = (check, msg) => problems.push({ check, msg });
const note = (check, msg) => notes.push({ check, msg });

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const hashOf = (rel) => createHash('sha256').update(readFileSync(join(ROOT, rel))).digest('hex').slice(0, 10);

/* ---------------------------------------------------------- ⓪ 页清单来源 */
/* 单册页与相簿数据的唯一真相源 = assets/js/photos-data.js（tools/photos-data.py 生成）。
   为什么从数据反推页清单、而不是 glob pages/albums/*.html：
     glob 只能发现**已经存在**的页 —— 生成器没跑、或者少生成了一本，glob 会安安静静地
     少检查一页；从数据反推则会把"这本该有页却没有"当场判红（见 ⑦ ALBUM）。
   ⚠️ 数据文件读不出来（没生成 / 被改坏）时**不能**静默降级成空清单 —— 那等于把
      19 个页面的守卫一起关掉。这里直接抛。 */
const ALBUM_PAGES = (() => {
  const src = read('assets/js/photos-data.js');
  const json = src.slice(src.indexOf('{'), src.lastIndexOf('}') + 1);
  let data;
  try {
    data = JSON.parse(json);
  } catch (e) {
    throw new Error(`assets/js/photos-data.js 读不出相簿清单（${e.message}）—— 重跑 tools/photos-data.py`);
  }
  return data.albums.map((a) => ({ slug: a.slug, zh: a.zh, count: a.count, file: `pages/albums/${a.slug}.html` }));
})();

/* 全部要查的页：手写的 7 页 + 19 个生成的单册页。 */
const PAGES = [...FIXED_PAGES, ...ALBUM_PAGES.map((a) => a.file)];

/* 多会话并行时的例外：`--head-for=a.css,b.js` 表示这几个资源的键按 **git HEAD 里的内容**算。
   为什么需要它：键的语义是"URL 随内容变"，所以**键必须匹配将要部署的那份内容**。
   并行会话改了 style.css 但没提交、而我只提交自己的文件时，若按工作区内容盖章，
   线上就会出现「HTML 声称是新内容、服务器发的还是旧内容」⇒ 浏览器把旧 CSS 缓存在
   一个"看起来是新的"URL 下；等对方真的推上去，URL 没变、缓存不失效 ⇒ 用户永远看到旧样式。
   （这正是 0a09db5 那类事故的成因，只不过换了个触发方式。） */
const HEAD_FOR = new Set(
  ((process.argv.find((a) => a.startsWith('--head-for=')) || '').split('=')[1] || '')
    .split(',').map((s) => s.trim()).filter(Boolean)
);
const headHashOf = (rel) =>
  createHash('sha256')
    .update(execFileSync('git', ['show', `HEAD:${rel}`], { cwd: ROOT, maxBuffer: 1 << 26 }))
    .digest('hex')
    .slice(0, 10);

/* 去注释 + 去空白：比的是代码，不是注释（各页注释本来就不同批次）。 */
const squeeze = (s) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, '');

const md5 = (s) => createHash('md5').update(s).digest('hex').slice(0, 10);

/* ---------------------------------------------------------------- ① KEY */
/* 本地资源引用：href/src="...assets/....(css|js)" ，可选 ?v= */
const REF_RE = /(href|src)="([^"]*?)(assets\/[^"?]+\.(?:css|js))(\?v=([0-9a-f]+))?"/g;
/* posts.html 里那条「全局没数据才动态加载」的兜底路径也会带键 */
const POSTS_FALLBACK_RE = /DY_DATA \+ \(location\.protocol === 'file:' \? '' : '\?v=[0-9a-f]+'\)/;

/* 剥掉相对前缀，回到仓库根相对路径。
   ⚠️ 必须剥**任意层**：原来只写了 `/^\.\.\//`（一次），7 个页最深只到 pages/*.html
     所以一直没暴露；2026-09-25 加了 pages/albums/<slug>.html（深度 2）之后，
   `../../assets/…` 会被剥成 `../assets/…` ⇒ KEY 检查把整片资源判成"引用的文件不存在"。
   这是个潜伏已久的 bug，不是新引入的。 */
const relOf = (prefix, assetPath) =>
  prefix.replace(/^(?:\.\.\/|\.\/)+/, '') + assetPath;

/* 采一遍当前磁盘上的引用（PRESENCE 也要用，所以单独留一份） */
function collectRefs() {
  const pageRefs = new Map();
  for (const page of PAGES) {
    const refs = [];
    for (const m of read(page).matchAll(REF_RE)) {
      const [, , prefix, assetPath, , key] = m;
      refs.push({ page, rel: relOf(prefix, assetPath), key: key ?? null, prefix, assetPath });
    }
    pageRefs.set(page, refs);
  }
  return pageRefs;
}

let pageRefs = collectRefs();

/* ⚠️ 必须是**函数**、而且要能被调两次：--write 之后得重新采一遍再判定。
   踩过的坑：改写完直接拿"改写前采到的问题"当结果 ⇒ 明明已经修好，
   退出码仍是 1 —— make-variants 里的 `execFileSync(stamp --write)` 当场抛错。 */
function checkKeys(fix) {
  const probs = [];
  const localRefs = new Map(); /* rel -> Set(keys) */
  const hashCache = new Map();
  const H = (rel) => {
    if (!hashCache.has(rel)) hashCache.set(rel, HEAD_FOR.has(rel) ? headHashOf(rel) : hashOf(rel));
    return hashCache.get(rel);
  };

  for (const page of PAGES) {
    const src = read(page);
    let mismatch = false;
    for (const m of src.matchAll(REF_RE)) {
      const [, , prefix, assetPath, , key] = m;
      const rel = relOf(prefix, assetPath);
      if (!existsSync(join(ROOT, rel))) {
        probs.push({ check: 'KEY', msg: `${page}: 引用的文件不存在 → ${rel}` });
        continue;
      }
      const want = H(rel);
      if (key !== want) {
        mismatch = true;
        probs.push({ check: 'KEY', msg: `${page}: ${rel} 的键是 ${key ?? '(无)'}，内容哈希应为 ${want}` });
      }
      if (!localRefs.has(rel)) localRefs.set(rel, new Set());
      localRefs.get(rel).add(key);
    }
    if (fix && mismatch) {
      writeFileSync(
        join(ROOT, page),
        src.replace(REF_RE, (whole, a, pfx, ap) => `${a}="${pfx}${ap}?v=${H(relOf(pfx, ap))}"`)
      );
    }
  }

  /* posts.html 的 JS 兜底路径：也得跟着盖章 */
  {
    const page = 'pages/posts.html';
    const src = read(page);
    const m = src.match(POSTS_FALLBACK_RE);
    if (!m) {
      probs.push({ check: 'KEY', msg: `${page}: 找不到数据兜底路径的键锚点（页面改动后要同步本脚本）` });
    } else {
      const want = H('assets/data/posts.js');
      const got = (m[0].match(/\?v=([0-9a-f]+)/) || [])[1];
      if (got !== want) {
        probs.push({ check: 'KEY', msg: `${page}: assets/data/posts.js 兜底路径的键是 ${got}，应为 ${want}` });
        if (fix) {
          writeFileSync(
            join(ROOT, page),
            src.replace(POSTS_FALLBACK_RE, `DY_DATA + (location.protocol === 'file:' ? '' : '?v=${want}')`)
          );
        }
      }
    }
  }

  for (const [rel, keys] of localRefs) {
    if (keys.size > 1) probs.push({ check: 'KEY', msg: `${rel} 在不同页面用了不同键：${[...keys].join(' / ')}` });
  }
  return { probs, assetCount: localRefs.size };
}

let keyRes = checkKeys(WRITE);
if (WRITE && keyRes.probs.length) {
  /* 改完再看一遍 —— 报告里给的必须是**当前磁盘的真实状态** */
  pageRefs = collectRefs();
  keyRes = checkKeys(false);
} else if (WRITE) {
  pageRefs = collectRefs();
}
for (const p of keyRes.probs) problems.push(p);
const assetCount = keyRes.assetCount;

/* ------------------------------------------------------------ ② PRESENCE */
for (const need of MUST_HAVE) {
  for (const page of PAGES) {
    const hit = pageRefs.get(page).some((r) => r.rel === need);
    if (!hit) fail('PRESENCE', `${page} 没有引 ${need}（加载/刷新行为会与其它页不同）`);
  }
}
for (const [asset, why] of Object.entries(KNOWN_DEVIATIONS)) {
  if (!asset.startsWith('assets/')) continue;
  const missing = PAGES.filter((p) => !pageRefs.get(p).some((r) => r.rel === asset));
  if (missing.length) note('PRESENCE', `${asset} 未出现在 ${missing.join(' / ')} —— ${why}`);
}

/* ------------------------------------------------------------- ③ SNIPPET */
const BLOCKS = [
  {
    name: 'nav-instant 判定',
    find: (src) => (src.match(/<script>\s*\n\s*\(function \(\) \{\s*\n\s*var de = document\.documentElement;[\s\S]*?\}\)\(\);/) || [])[0],
  },
  {
    name: 'speculationrules',
    find: (src) => (src.match(/<script type="speculationrules">([\s\S]*?)<\/script>/) || [])[0],
  },
  {
    name: 'load+2s 兜底',
    find: (src) =>
      (src.match(/addEventListener\('load',\s*function\s*\(\)\s*\{\s*setTimeout\(function\s*\(\)\s*\{\s*var loader\s*=\s*document\.getElementById\('pageLoader'\);[\s\S]*?\},\s*\d+\);/) || [])[0],
  },
  {
    name: 'inline-pageLoader-style',
    find: (src) => {
      const styles = src.match(/<style[^>]*>[\s\S]*?<\/style>/g) || [];
      return styles.filter((b) => b.includes('pageLoader')).join('\n');
    },
    soft: true,
  },
];

for (const block of BLOCKS) {
  const seen = new Map(); /* hash -> pages[] */
  for (const page of PAGES) {
    const raw = block.find(read(page));
    if (!raw) {
      fail('SNIPPET', `${page}: 找不到「${block.name}」`);
      continue;
    }
    const h = md5(squeeze(raw));
    if (!seen.has(h)) seen.set(h, []);
    seen.get(h).push(page);
  }
  if (seen.size > 1) {
    const groups = [...seen.entries()].map(([h, ps]) => `${h}:[${ps.length}页]`).join('  ');
    if (block.soft) note('SNIPPET', `「${block.name}」有两种写法 —— ${groups}｜${KNOWN_DEVIATIONS[block.name] || ''}`);
    else fail('SNIPPET', `「${block.name}」在各页不一致（同一份代码只要有一页手滑就漂移）—— ${groups}`);
  }
  const pages = [...seen.values()].flat();
  if (!block.soft) note('SNIPPET', `「${block.name}」md5 ${[...seen.keys()].join(',')} 覆盖 ${pages.length} 页`);
}

/* ----------------------------------------------------------- ④ ONE-PLACE */
/* ④ ONE-PLACE：刷新策略只许住在一个文件里。
   `rm-pos` 是 2026-09-17 加的「刷新位置兜底」的记录键（webKit 在滚动停稳前刷新会回顶，
   实测窗口 0.4~0.8s）—— 它和 rm-top-on-load 是同一类东西：跨页面的会话状态，
   一旦在别处生根就会和 script.js 抢同一个键，所以一并按"只许住在一处"管。
   `rm-ptr` 是 2026-09-23 加的「跨文档补 hover」用的指针位置键（第三百一十二批），
   同为跨页面会话状态，同理：多一个写者就会和新文档的命中测试抢同一个值。 */
const POLICY_TOKENS = ['scrollRestoration', 'rm-top-on-load', 'rm-pos', 'rm-ptr', 'location.reload'];
const POLICY_HOME = 'assets/js/script.js';
for (const page of PAGES) {
  const src = read(page);
  for (const tok of POLICY_TOKENS) {
    if (src.includes(tok)) fail('ONE-PLACE', `${page} 里出现了「${tok}」—— 刷新策略只许住在 ${POLICY_HOME}`);
  }
}
for (const rel of ['assets/js/loader.js']) {
  for (const tok of POLICY_TOKENS) {
    if (read(rel).includes(tok)) fail('ONE-PLACE', `${rel} 里出现了「${tok}」—— 刷新策略只许住在 ${POLICY_HOME}`);
  }
}
if (!read(POLICY_HOME).includes('rm-top-on-load')) {
  fail('ONE-PLACE', `${POLICY_HOME} 里没有找到刷新策略（期望 rm-top-on-load）`);
}
/* 全站 JS 扫描：策略不许在别的地方生根。
   只扫 assets/js/*.js 与五个正式页 —— 刻意不递归整个仓库：.workbuddy/scratch 与
   pages/__* 是夹具体，它们本来就在复刻旧行为（递归会把夹具的故意复刻报成漂移）。 */
for (const f of readdirSync(join(ROOT, 'assets/js')).filter((n) => n.endsWith('.js'))) {
  const rel = `assets/js/${f}`;
  if (rel === POLICY_HOME) continue;
  for (const tok of POLICY_TOKENS) {
    if (read(rel).includes(tok)) fail('ONE-PLACE', `${rel} 里出现了「${tok}」—— 刷新策略只许住在 ${POLICY_HOME}`);
  }
}

/* ------------------------------------------------------------- ⑤ CURTAIN */
/* 五条里唯一一条**判"审美存在"**而不是判"一致性"的检查。
   理由是幕布的失效方式全都长得像优化：
     · 有人觉得首访多等 900ms 碍事，把 REVEAL_AFTER_MS 抬到 1000 —— loader.js 里
       记着主人「试过，已回退」，那等于线上首访的幕布再也不会出现；
     · 有人觉得"站内导航也别画"顺手把 nav-instant 那条 CSS 一起删了 —— 幕布还在，
       但再也见不到；
     · 有人重构 loader.js 时把唯一的放行动作 `is-shown` 去掉 —— 幕布永远 opacity:0。
   三种都不会让任何页面报错、也不会让 KEY/SNIPPET 变红，所以必须在这里拦。 */
const REVEAL_MAX = 300;   /* 露出阈值上限：再大就等于删幕布（线上首访 load 462~911ms） */
const MIN_VISIBLE_MIN = 400; /* 露脸下限：不许一闪 */

{
  const loaderJs = read('assets/js/loader.js');
  const loaderCss = read('assets/css/loader.css');

  for (const page of PAGES) {
    const src = read(page);
    if (!src.includes('id="pageLoader"')) {
      fail('CURTAIN', `${page}: 找不到 #pageLoader 标记 —— 加载幕布被删了（主人的设计特色，别删）`);
    }
    const dots = (src.match(/class="page-loader-dot"/g) || []).length;
    if (dots !== 3) {
      fail('CURTAIN', `${page}: three-body 幕布应有 3 个圆点，实到 ${dots} 个`);
    }
  }

  const mReveal = loaderJs.match(/REVEAL_AFTER_MS\s*=\s*(\d+)/);
  if (!mReveal) {
    fail('CURTAIN', 'assets/js/loader.js: 找不到 REVEAL_AFTER_MS —— 幕布露出时机被摘了');
  } else if (Number(mReveal[1]) > REVEAL_MAX) {
    fail('CURTAIN', `assets/js/loader.js: REVEAL_AFTER_MS=${mReveal[1]} > ${REVEAL_MAX} —— ` +
      '线上首访 load 是 462~911ms，抬到这个数就等于首访永远看不到幕布（= 把幕布删掉）');
  }

  const mMin = loaderJs.match(/MIN_VISIBLE_MS\s*=\s*(\d+)/);
  if (!mMin) {
    fail('CURTAIN', 'assets/js/loader.js: 找不到 MIN_VISIBLE_MS —— 防「一闪」的闸门被摘了');
  } else if (Number(mMin[1]) < MIN_VISIBLE_MIN) {
    fail('CURTAIN', `assets/js/loader.js: MIN_VISIBLE_MS=${mMin[1]} < ${MIN_VISIBLE_MIN} —— 幕布会一闪即走`);
  }

  if (!loaderJs.includes("classList.add('is-shown')")) {
    fail('CURTAIN', "assets/js/loader.js: 找不到唯一的放行动作 `classList.add('is-shown')` —— " +
      '幕布会永远停在 opacity:0');
  }
  if (!/#pageLoader:not\(\.is-shown\)\s*\{\s*opacity:\s*0;?\s*\}/.test(loaderCss)) {
    fail('CURTAIN', 'assets/css/loader.css: 找不到 `#pageLoader:not(.is-shown){opacity:0}` —— ' +
      '这是 loader.js 唯一的表现开关，别为了"少一层样式"删它');
  }
  if (!/html\.nav-instant\s+#pageLoader\s*\{\s*display:\s*none;?\s*\}/.test(loaderCss)) {
    fail('CURTAIN', 'assets/css/loader.css: 找不到 `html.nav-instant #pageLoader{display:none}` —— ' +
      '站内导航会重新闪出全屏幕布');
  }

  if (mReveal && mMin) {
    note('CURTAIN', `幕布在位：#pageLoader ×${PAGES.length} 页（各 3 圆点）· ` +
      `REVEAL_AFTER_MS=${mReveal[1]} · MIN_VISIBLE_MS=${mMin[1]}`);
  }
}

/* -------------------------------------------------------------- ⑥ SCROLL */
/* 滚动触感的站点级开关：`<html data-scroll="native">` = 退回浏览器原生滚动；
   **没写**才轮到 script.js 开头那套自研滚轮平滑。所以这条属性一旦在几页之间漂移，
   用户看到的就是"一页一个手感"——而且不报错、上面五条检查全绿也发现不了。
   历史来回三次：09-07 子页面原生 → 09-14 全站平滑 → 09-21 全站原生（主人
   "网页滑动手感调回和普通页面的滑动手感一样"）。三趟都栽在"靠人记住七页都写"，
   所以在这里把它变成机器判据：值必须七页一致，不一致就红。
   ⚠️ 判的是**去注释后的**源码 —— 各页 <html> 上面那段说明里本身就写着这个属性名，
   不去注释会把它误当成真的写了。 */
{
  const vals = new Map();
  for (const page of PAGES) {
    const src = read(page).replace(/<!--[\s\S]*?-->/g, '');
    const m = src.match(/<html[^>]*\bdata-scroll="([^"]*)"/);
    const v = m ? m[1] : '(未写 → 该页会走自研平滑引擎)';
    if (!vals.has(v)) vals.set(v, []);
    vals.get(v).push(page);
  }
  if (vals.size > 1) {
    const groups = [...vals.entries()].map(([v, ps]) => `${v}:[${ps.join(' / ')}]`).join('  ');
    fail('SCROLL', `data-scroll 在各页不一致 —— ${groups}`);
  } else {
    note('SCROLL', `<html data-scroll="${[...vals.keys()][0]}" ×${PAGES.length} 页 —— 全站同一套滚动`);
  }
}

/* -------------------------------------------------------------- ⑦ ALBUM */
/* 相簿是**生成物**：页数、每页张数、墙上的格数，全都得跟 assets/js/photos-data.js 对得上。
   这类漂移的形态是"加了相簿 / 换了照片，忘了重跑 tools/photos-data.py"——
   页面照旧能开、上面六条检查全绿，只是少了一本、或者一本里少了几张照片。
   ⚠️ 判的是**类名出现次数**，不是"文件在不在"：生成过一次之后文件一直都在。 */
{
  const esc = (s) => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;');

  const wall = read('pages/photos.html');
  const tiles = (wall.match(/class="album-tile"/g) || []).length;
  if (tiles !== ALBUM_PAGES.length) {
    fail('ALBUM', `pages/photos.html: 墙上有 ${tiles} 格，数据里是 ${ALBUM_PAGES.length} 本 —— 重跑 tools/photos-data.py`);
  }
  /* 🗑️ 原来这里还有一条「数据条」检查（读 `class="album-stat-v"` 的两个数、比对 本数 / 总张数），
     2026-09-27 随元素一起删除 —— 那天主人要求把 pages/photos.html 的顶部数据条整体撤掉，
     页面上已经不存在那两个数，留着这条只会恒报 "数据条 ，应为 19 / 268"。
     ⚠️ "加了相簿忘了重跑生成器"这个漂移**没有失去覆盖**：上面那条「墙上有几格」查的就是同一件事
        （墙与数据条都由 build_data() 的同一份 albums 派生）。别再把它加回来。 */
  for (const a of ALBUM_PAGES) {
    if (!existsSync(join(ROOT, a.file))) {
      fail('ALBUM', `${a.file} 不存在 —— 相簿页是生成的，重跑 tools/photos-data.py`);
      continue;
    }
    const src = read(a.file);
    const shots = (src.match(/class="album-shot"/g) || []).length;
    if (shots !== a.count) fail('ALBUM', `${a.file}: 照片 ${shots} 张，数据里是 ${a.count} 张`);
    if (!src.includes(`<h1 class="album-title">${esc(a.zh)}</h1>`)) {
      fail('ALBUM', `${a.file}: 书名不是「${a.zh}」`);
    }
  }
}

/* ------------------------------------------------------------- ⑧ INLINE */
/* 首绘要用的两段代码是**逐字节内联**进页面的（解析期、零网络）：图片交接 plate.js
   与对齐行几何 album-strip.js（为什么必须内联，见那两个文件的头注）。
   它们不经过 URL、没有 ?v=，所以"改了源文件忘了重跑生成器"**一点症状都没有** ——
   源文件看起来是新的，线上跑的是旧副本。这里把副本与源文件逐字节对上。
   ⚠️ 留空 = 这一页不需要（pages/album.html 是纯路由器，不需要首绘代码），
      但**要求的页**留空也算失败。 */
{
  const NEEDED = {
    'assets/js/plate.js': ['pages/photos.html', ...ALBUM_PAGES.map((a) => a.file)],
    'assets/js/album-strip.js': ALBUM_PAGES.map((a) => a.file),
  };
  for (const [rel, pages] of Object.entries(NEEDED)) {
    const want = '<script>\n' + read(rel) + '</script>';
    const re = new RegExp('<!--RM-BEGIN inline:' + rel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
      '-->([\\s\\S]*?)<!--RM-END inline:');
    for (const page of pages) {
      if (!existsSync(join(ROOT, page))) continue;      /* ⑦ 已经报过了 */
      const m = read(page).match(re);
      if (!m) { fail('INLINE', `${page}: 找不到 ${rel} 的内联段（标记被删了？）`); continue; }
      if (m[1] !== want) {
        fail('INLINE', `${page}: ${rel} 的内联副本与源文件不一致 —— 改了源要重跑 tools/photos-data.py`);
      }
    }
  }
  note('INLINE', `首绘内联：plate.js → ${NEEDED['assets/js/plate.js'].length} 页 · ` +
    `album-strip.js → ${NEEDED['assets/js/album-strip.js'].length} 页`);
}

/* -------------------------------------------------------------- ⑨ BOOT */
/* 「内联」≠「执行过」。两段首绘代码定义完之后必须**就地调用**，否则几何与图片交接
   都要等 defer 的 photos.js（= DCL），跨文档过渡的新页快照里就是：散着没排版的按钮
   + 硬切出来的图。2026-09-25 第二轮实测（限速 100ms/500KB/s，直接进册页）：
     漏掉调用              → 引擎晚快照 20~50ms（5/5 失败）
     补上调用、但位置在 plate.js 之后（中间隔 ~90 行）→ 仍然晚 20~50ms（5/5 失败）
     补上调用 + 挪到照片墙正后方                      → 快照里 rows 已是最终值（5/5 命中）
   ⇒ 这里守两件事：① 调用在（且紧跟定义）；② 单册页里几何引擎**排在** plate.js 前面。
   ⚠️ 别"顺手"把 plate.js 挪到引擎前面：hydrate 要扫一整册的图，实测吃掉 20~50ms，
      足够把引擎又推到快照之后（就是上面第二行那个结果）。 */
{
  const BOOT = {
    'assets/js/plate.js': ['pages/photos.html', ...ALBUM_PAGES.map((a) => a.file)],
    'assets/js/album-strip.js': ALBUM_PAGES.map((a) => a.file),
  };
  const CALL = {
    'assets/js/plate.js': 'RMPlate.hydrate(document);',
    'assets/js/album-strip.js': "RMAlbumStrip.paint(document.getElementById('albumStrip'));",
  };
  for (const [rel, pages] of Object.entries(BOOT)) {
    const end = `<!--RM-END inline:${rel}-->`;
    for (const page of pages) {
      if (!existsSync(join(ROOT, page))) continue;      /* ⑦ 已经报过了 */
      const src = read(page);
      const i = src.indexOf(end);
      if (i < 0) continue;                              /* ⑧ 已经报过了 */
      /* 调用要落在紧跟定义的那一小段里（中间不许再塞别的脚本） */
      if (!src.slice(i + end.length, i + end.length + 400).includes(CALL[rel])) {
        fail('BOOT', `${page}: ${rel} 内联段之后缺少就地调用 \`${CALL[rel]}\``);
      }
    }
  }
  for (const a of ALBUM_PAGES) {
    if (!existsSync(join(ROOT, a.file))) continue;
    const src = read(a.file);
    const engine = src.indexOf('inline:assets/js/album-strip.js');
    const plate = src.indexOf('inline:assets/js/plate.js');
    if (engine >= 0 && plate >= 0 && engine > plate) {
      fail('BOOT', `${a.file}: 几何引擎排在了 plate.js 后面 —— 渲染闸会多压 20~50ms（hydrate 要扫一整册图）`);
    }
    /* 渲染闸三件套：闸本体 / 开闸的 id / 保命撤闸。少一件都可能把渲染永久压住。 */
    const GATE = [
      ['<link rel="expect" id="rmExpect" href="#rmRows" blocking="render">', '闸本体'],
      ["row.id = 'rmRows'", '开闸的 id'],
      ["document.getElementById('rmExpect')", '保命撤闸'],
    ];
    for (const [needle, what] of GATE) {
      if (!src.includes(needle)) fail('BOOT', `${a.file}: 渲染闸缺了「${what}」（${needle}）`);
    }
    /* 🔴 闸与保命脚本都必须在 head **末尾**（四张样式表之后）。实测三种摆法：
         两段都在 </head> 前 → 5/5 命中；闸在末尾、保命在样式表前 → 0/5；
         两段都在样式表前 → 0/5。即"解析器被保命脚本按在 head 里等样式表"是闸生效的
         前提，反直觉但可复现。所以这里判：闸排在最后一张样式表之后。 */
    const gateAt = src.indexOf('id="rmExpect"');
    const lastLink = src.lastIndexOf('<link rel="stylesheet"');
    if (gateAt >= 0 && lastLink >= 0 && gateAt < lastLink) {
      fail('BOOT', `${a.file}: 渲染闸排在样式表之前 —— 实测这种摆法闸会被无视（0/5）`);
    }
  }
  note('BOOT', `首绘调用：plate.hydrate → ${BOOT['assets/js/plate.js'].length} 页 · ` +
    `RMAlbumStrip.paint → ${BOOT['assets/js/album-strip.js'].length} 页（引擎在 plate.js 之前 · 渲染闸 ${ALBUM_PAGES.length} 页）`);
}

/* ---------------------------------------------------------------- 输出 */
const result = { ok: problems.length === 0, problems, notes };
if (JSON_ONLY) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const byCheck = {};
  for (const p of problems) (byCheck[p.check] ||= []).push(p.msg);
  for (const [c, msgs] of Object.entries(byCheck)) {
    console.log(`\n▲ ${c} —— ${msgs.length} 处`);
    for (const m of msgs) console.log(`   · ${m}`);
  }
  console.log(
    `\n${problems.length === 0 ? '✅ 一致' : `❌ ${problems.length} 处漂移`}　（KEY ${assetCount} 个资源 · ${PAGES.length} 页 · ${notes.length} 条提醒）`
  );
  if (WRITE && problems.some((p) => p.check === 'KEY')) console.log('（--write：?v= 已改写成内容哈希，重新跑一次确认）');
  if (VERBOSE || problems.length === 0) {
    for (const n of notes) console.log(`   · ${n.check}: ${n.msg}`);
  }
}
process.exit(problems.length === 0 ? 0 : 1);
