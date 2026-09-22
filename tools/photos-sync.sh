#!/usr/bin/env bash
# 相簿 WebP → Cloudflare R2。
#
# 网站读的是 R2（地址写在 assets/js/photos.js 的 CDN / CDN_V），仓库里一张图都不留，
# 所以每次新增相簿 / 加了照片、跑完 tools/photos-derive.py 之后都要来这里同步一次。
#
#   bash tools/photos-sync.sh          # 上传（只传有差的，幂等）
#   bash tools/photos-sync.sh --check  # 只校验，不上传
#
# 前置：
#   · rclone 的 `r2:` remote 指向 Cloudflare R2（~/.config/rclone/rclone.conf）。
#     R2 的 secret 轮换过、profile 里的旧值会静默 403（SignatureDoesNotMatch），
#     改完先 `rclone lsf r2:andyttc05/photos/` 确认能列。
#   · 桶 andyttc05 的公开域名是 https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev
#     （就是 index.html 里 hero/projects 用的那个）。
#
# ⚠️ 过滤必须用 --filter，不能用 --include / --exclude：
#    rclone 里只要出现 --include "*.webp"，后面的 --exclude "_review/**" 就**不生效**
#    （2026-09-23 实测，四种写法只有 --filter 拦得住），会把 assets/photos/_review/thumbs
#    那 272 个核对缩图一起传上去。末尾那条 `- **` 也不能省 —— 少了它，所有非 webp
#    原图（heic/jpg）都会被带上。
#    （`_review/` 与 `_duplicates/` 这两个目录 2026-09-23 已清掉，下面两条过滤器留着当护栏：
#      管线要是哪天又生成它们，不会顺手把垃圾传上去。）
set -euo pipefail

BUCKET="${R2_BUCKET:-r2:andyttc05}"
# ⚠️ photos/ 在**桶根**，不是 images/photos/ —— 照抄仓库的 assets/ 结构：
#    assets/photos/（照片）与 assets/images/（hero/projects/vslide 等非照片）平级，
#    R2 这边 photos/ 与 images/ 也平级。别把它塞回 images/ 里。
PREFIX="${R2_PREFIX:-photos}"
SRC="$(cd "$(dirname "$0")/.." && pwd)/assets/photos"

FILTER=(
  --filter "- /_review/**"       # 一次性核对页的缩图，不对外
  --filter "- /_duplicates/**"   # 待确认删除的近似照
  --filter "+ *.webp"
  --filter "- **"                # 其余（heic/jpg/manifest）一律不上传
)

remote_count() { rclone lsf "$BUCKET/$PREFIX/" -R --s3-no-check-bucket 2>/dev/null | grep -vc '/$'; }
local_count()  { rclone lsf "$SRC" -R "${FILTER[@]}" 2>/dev/null | grep -vc '/$'; }

if [ "${1:-}" = "--check" ]; then
  rclone check "$SRC" "$BUCKET/$PREFIX" "${FILTER[@]}" --s3-no-check-bucket --checkers 16
else
  rclone copy "$SRC" "$BUCKET/$PREFIX" "${FILTER[@]}" --s3-no-check-bucket \
    --transfers 16 --checkers 16 \
    --header-upload "Cache-Control: public, max-age=31536000, immutable"
fi

L="$(local_count)"; R="$(remote_count)"
echo "本地 $L 个 / 远端 $R 个"
[ "$L" = "$R" ] || { echo "❌ 数量对不上，先看 --check 的输出"; exit 1; }

# 抽查一个真实 URL：确认公开域名在服务，且 Content-Type 是 image/webp。
# ⚠️ 这里用 `sed -n 1p` 而不是 `head -1` —— head 会提前关管道，
#    配 `set -o pipefail` 时整条 pipeline 返回 141(SIGPIPE)，脚本会静默半途退出。
SAMPLE="$(rclone lsf "$BUCKET/$PREFIX/" -R --s3-no-check-bucket 2>/dev/null | grep -v '/$' | sed -n '1p')"
curl -sSI "https://pub-4a7ebf0d83dc43fe81c6d3a51b017cfc.r2.dev/$PREFIX/$SAMPLE" \
  | grep -qi "content-type: image/webp" && echo "✅ $L 个对象，公开域名可用"
