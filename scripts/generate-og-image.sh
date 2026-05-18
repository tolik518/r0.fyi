#!/bin/bash
# Generate an Open Graph social preview image for a blog post.
#
# Usage:
#   ./scripts/generate-og-image.sh "Post Title" "slug" ["subtitle"] ["fixed in version"] ["date"]
#
# Examples:
#   ./scripts/generate-og-image.sh "Tangled knotmirror: SSRF via User-Controlled Knot URL" "tangled-knotmirror-ssrf" "Security write-up by tolik518" "Fixed in v1.14.0-alpha" "2026-05-17"
#   ./scripts/generate-og-image.sh "Hello World" "hello-world"
#
# Output: images/social-preview/<slug>.png (1200x630, OG-compliant)
#
# Requirements: ImageMagick (convert)

set -euo pipefail

TITLE="${1:?Usage: $0 \"Title\" \"slug\" [\"subtitle\"] [\"fixed in\"] [\"date\"]}"
SLUG="${2:?Usage: $0 \"Title\" \"slug\" [\"subtitle\"] [\"fixed in\"] [\"date\"]}"
SUBTITLE="${3:-"Blog post by tolik518"}"
FIXED_IN="${4:-""}"
DATE="${5:-$(date +%Y-%m-%d)}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT="$PROJECT_ROOT/images/social-preview/${SLUG}.png"

# Site style constants
BG_COLOR="#2b2b2b"
ACCENT_COLOR="#32cd32"
TEXT_COLOR="#ffffff"
SUBTLE_COLOR="#6a9955"
HIGHLIGHT_COLOR="#569cd6"
FONT="DejaVu-Sans-Mono"
FONT_BOLD="DejaVu-Sans-Mono-Bold"

# Wrap title to fit (roughly 28 chars per line at pointsize 48 on 1200px width)
WRAPPED_TITLE=$(echo "$TITLE" | fold -s -w 28)

CMD=(convert -size 1200x630 xc:"$BG_COLOR"
  -font "$FONT" -pointsize 44 -fill "$ACCENT_COLOR"
  -gravity NorthWest
  -annotate +60+60 "r0.fyi"
  -font "$FONT_BOLD" -pointsize 48 -fill "$TEXT_COLOR"
  -annotate +60+140 "$WRAPPED_TITLE"
  -font "$FONT" -pointsize 30 -fill "$SUBTLE_COLOR"
  -annotate +60+370 "$SUBTITLE"
)

if [ -n "$FIXED_IN" ]; then
  CMD+=(-font "$FONT" -pointsize 26 -fill "$HIGHLIGHT_COLOR"
    -annotate +60+430 "$FIXED_IN")
fi

CMD+=(-fill "$ACCENT_COLOR" -pointsize 22
  -annotate +60+560 "$DATE"
  -stroke "$ACCENT_COLOR" -strokewidth 2 -fill none
  -draw "rectangle 30,30 1170,600"
  "$OUTPUT")

"${CMD[@]}"

echo "✓ Generated: $OUTPUT"
