#!/bin/bash
# 上传 andyttc05.github.io 媒体文件到腾讯云 COS
# 用法：先配置 coscmd，然后运行此脚本
#
# 优化要点：
#   1. webp 在上传前先按目标渲染尺寸 resize + 重压缩，省 ~50% 体积
#   2. 设 Cache-Control: public, max-age=31536000, immutable (一年强缓存)
#   3. favicon.svg 始终走本地，不上传
#   4. 自动跳过 .DS_Store 和 .bak-originals

set -e

COSCMD="/Users/andyttc/.workbuddy/binaries/python/envs/default/bin/coscmd"
PROJECT="/Users/andyttc/Documents/andyttc05.github.io"
STAGING=$(mktemp -d)
trap "rm -rf $STAGING" EXIT

# 目标尺寸（与 HTML 里 width= 对齐；为 2x 屏预留）
HERO_MAX_W=1280          # hero 立绘
VSLIDE_MAX_W=1000        # 5 张过渡图
GAME_MAX_W=320           # 游戏 logo（chip 渲染 160px，320 是 2x 上限）

# coscmd -H 接受 YAML 字符串（不是 "Header: value" 格式）
CACHE_HEADER='Cache-Control: public,max-age=31536000,immutable'
SKIP_BAK_ARGS=(--ignore ".bak-originals/*" --ignore "*.DS_Store")

# === 第一步：预处理 webp，把重压后的版本放进 staging ===
echo "==> 预处理 webp（按目标尺寸 resize + 重压缩）..."
mkdir -p "$STAGING/images/hero" "$STAGING/images/vslide" "$STAGING/icons/games"

# Hero：单张大图
for src in "$PROJECT/assets/images/hero/"*.webp; do
  [ -f "$src" ] || continue
  cwebp -q 82 -resize $HERO_MAX_W 0 -m 6 -af "$src" -o "$STAGING/images/hero/$(basename "$src")" >/dev/null
done

# Vslide：5 张过渡图
for src in "$PROJECT/assets/images/vslide/"*.webp; do
  [ -f "$src" ] || continue
  cwebp -q 82 -resize $VSLIDE_MAX_W 0 -m 6 -af "$src" -o "$STAGING/images/vslide/$(basename "$src")" >/dev/null
done

# Games：3 个 logo（小）
for src in "$PROJECT/assets/icons/games/"*.webp; do
  [ -f "$src" ] || continue
  cwebp -q 85 -resize $GAME_MAX_W 0 -m 6 -af "$src" -o "$STAGING/icons/games/$(basename "$src")" >/dev/null
done

echo "==> 预处理完成。staging 大小："
du -sh "$STAGING"/*

# === 第二步：上传到 COS，带 Cache-Control 头 ===
echo ""
echo "==> 上传 images/ ..."
"$COSCMD" upload -r -s -y --skipmd5 "${SKIP_BAK_ARGS[@]}" \
  -H "$CACHE_HEADER" \
  "$STAGING/images/" "/images/"

echo ""
echo "==> 上传 icons/skills/ (SVG 透传)..."
"$COSCMD" upload -r -s -y --skipmd5 "${SKIP_BAK_ARGS[@]}" \
  -H "$CACHE_HEADER" \
  "$PROJECT/assets/icons/skills/" "/icons/skills/"

echo ""
echo "==> 上传 icons/contact/ (SVG 透传)..."
"$COSCMD" upload -r -s -y --skipmd5 "${SKIP_BAK_ARGS[@]}" \
  -H "$CACHE_HEADER" \
  "$PROJECT/assets/icons/contact/" "/icons/contact/"

echo ""
echo "==> 上传 icons/games/ (webp 已重压)..."
"$COSCMD" upload -r -s -y --skipmd5 "${SKIP_BAK_ARGS[@]}" \
  -H "$CACHE_HEADER" \
  "$STAGING/icons/games/" "/icons/games/"

echo ""
echo "==> 上传完成 ✅"
echo ""
echo "==> 列出 COS 上的文件 ..."
"$COSCMD" list "/"
