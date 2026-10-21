#!/usr/bin/env bash
# Assemble dist/ -- the exact set of files that may be published.
#
# WHY THIS EXISTS
# ---------------
# On GitHub Pages, Jekyll runs and `_config.yml`'s `exclude:` list is what
# keeps the authoring tools, the internal README, the audit and the SEO plan
# off the public site. It is the only mechanism that host offers.
#
# Cloudflare Pages does not run Jekyll. `_config.yml` becomes an inert file,
# and every path in this repository is uploaded -- including AUDIT.md and
# LOCAL-SEO.md, which between them list which business claims are unverified,
# which listings are unclaimed and which policies still need a lawyer. That is
# a briefing document for a competitor, published at a guessable URL.
#
# `_redirects` has rules for some of those paths, but Cloudflare Pages serves
# a matching static asset in PREFERENCE to a redirect rule, so those rules are
# a guard and not a guarantee. The file says so itself.
#
# ALLOWLIST, NOT DENYLIST
# -----------------------
# This copies only what is named below. A denylist fails open: the next file
# somebody adds to the repository is public unless they remember to exclude
# it. An allowlist fails closed, which is the correct direction for a mistake
# about publishing a client's internal notes.
#
# `functions/` is deliberately NOT copied. Cloudflare Pages reads Pages
# Functions from the root of the PROJECT, not from the build output
# directory, so it stays where it is and is never served as a static file.
#
# USAGE
#   bash tools/build-dist.sh          # writes ./dist
#   bash tools/build-dist.sh --list   # show what would be published, write nothing

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$ROOT/dist"
LIST_ONLY="${1:-}"

cd "$ROOT"

# --- what may be published -------------------------------------------------
# Directories copied whole.
DIRS=(css js content locations services guides)

# Single files copied if present.
FILES=(
  index.html about.html contact.html faq.html gallery.html
  locations.html services.html privacy.html terms.html 404.html
  robots.txt sitemap.xml llms.txt site.webmanifest
  favicon.ico favicon-32x32.png favicon-16x16.png
  _headers _redirects
)

# assets/ is copied whole EXCEPT this subfolder: the client's master logo
# artwork. Nothing on the site references it; it lives in the repo so the
# delivered icons can be rebuilt from it.
ASSET_EXCLUDE="brand"

if [ "$LIST_ONLY" = "--list" ]; then
  echo "Would publish:"
else
  rm -rf "$DIST"
  mkdir -p "$DIST"
fi

copy() {
  local src="$1"
  if [ ! -e "$src" ]; then return; fi
  if [ "$LIST_ONLY" = "--list" ]; then
    find "$src" -type f | sed "s|^|  |"
    return
  fi
  if [ -d "$src" ]; then
    mkdir -p "$DIST/$src"
    cp -r "$src/." "$DIST/$src/"
  else
    cp "$src" "$DIST/$src"
  fi
}

for d in "${DIRS[@]}"; do copy "$d"; done
for f in "${FILES[@]}"; do copy "$f"; done

# assets, minus the master artwork
if [ -d assets ]; then
  if [ "$LIST_ONLY" = "--list" ]; then
    find assets -type f -not -path "assets/$ASSET_EXCLUDE/*" | sed "s|^|  |"
  else
    mkdir -p "$DIST/assets"
    (cd assets && tar --exclude="./$ASSET_EXCLUDE" -cf - .) | (cd "$DIST/assets" && tar -xf -)
  fi
fi

if [ "$LIST_ONLY" = "--list" ]; then exit 0; fi

# --- prove nothing internal got in ----------------------------------------
# A build that silently publishes the audit is the failure this script exists
# to prevent, so it checks its own output rather than trusting the list above.
LEAKS=0
while IFS= read -r pattern; do
  hits="$(cd "$DIST" && find . -iname "$pattern" 2>/dev/null || true)"
  if [ -n "$hits" ]; then
    echo "LEAK: $pattern" >&2
    echo "$hits" | sed 's|^|      |' >&2
    LEAKS=$((LEAKS + 1))
  fi
done <<'PATTERNS'
README.md
AUDIT.md
LOCAL-SEO.md
*.ps1
*.sh
*.py
.env*
*.sql
PATTERNS

for forbidden in tools migrations functions assets/brand .git; do
  if [ -e "$DIST/$forbidden" ]; then
    echo "LEAK: $forbidden/ was copied into dist" >&2
    LEAKS=$((LEAKS + 1))
  fi
done

if [ "$LEAKS" -gt 0 ]; then
  echo "" >&2
  echo "Refusing to call this build clean: $LEAKS problem(s) above." >&2
  exit 1
fi

FILECOUNT=$(find "$DIST" -type f | wc -l | tr -d ' ')
SIZE=$(du -sh "$DIST" | cut -f1)
HTML=$(find "$DIST" -name '*.html' | wc -l | tr -d ' ')

echo "dist/ built: $FILECOUNT files, $HTML HTML pages, $SIZE"
echo "nothing internal in it: README, AUDIT, LOCAL-SEO, tools, migrations,"
echo "scripts, .env, SQL and the master artwork are all absent."
