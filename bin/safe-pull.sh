#!/usr/bin/env bash
#
# safe-pull.sh — Pull from Shopify without losing local work.
#
# How it works:
#   1. Stashes any uncommitted local changes
#   2. Pulls remote theme into the working tree
#   3. Shows a diff of what Shopify changed vs your local state
#   4. Lets you choose: accept all, reject all, or review file-by-file
#
# Usage:
#   ./bin/safe-pull.sh                          # pull entire theme
#   ./bin/safe-pull.sh --only sections/header.liquid  # pull specific files
#   ./bin/safe-pull.sh --dry-run                # just show what would change

set -euo pipefail

# On Windows (Git Bash / MSYS), npm-installed tools like shopify need Node on PATH.
# Inherit the Windows PATH if node isn't found.
if ! command -v node &>/dev/null; then
  export PATH="$PATH:/c/Program Files/nodejs:/c/Users/$USER/AppData/Roaming/npm"
  # If still not found, try the raw Windows PATH
  if ! command -v node &>/dev/null && [ -n "${WSLENV:-}" ] || [ -n "${MSYSTEM:-}" ]; then
    echo "ERROR: 'node' not found. Make sure Node.js is installed and on your PATH."
    echo "Try running: export PATH=\"\$PATH:/c/Program Files/nodejs\""
    exit 1
  fi
fi

THEME_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$THEME_DIR"

THEME_ID="147874775176"
STORE="scentsbysara-dev.myshopify.com"
DRY_RUN=false
PULL_ARGS=()

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      PULL_ARGS+=("$1")
      shift
      ;;
  esac
done

echo "=== Safe Shopify Theme Pull ==="
echo ""

# Step 1: Check for uncommitted changes
HAS_CHANGES=false
if ! git diff --quiet || ! git diff --cached --quiet; then
  HAS_CHANGES=true
  echo "[1/4] Stashing local changes..."
  git stash push -m "safe-pull: auto-stash $(date +%Y-%m-%d_%H:%M:%S)"
  echo "      Stashed successfully."
else
  echo "[1/4] No uncommitted changes — nothing to stash."
fi
echo ""

# Step 2: Pull from Shopify into a temp branch
if [ "$DRY_RUN" = true ]; then
  echo "[2/4] DRY RUN — pulling to temp directory to preview changes..."
  TEMP_DIR=$(mktemp -d)
  trap "rm -rf '$TEMP_DIR'" EXIT

  # Copy current state to temp (exclude .git so Shopify CLI doesn't warn)
  rsync -a --exclude='.git' --exclude='bin' --exclude='node_modules' . "$TEMP_DIR/" 2>/dev/null \
    || find . -maxdepth 1 ! -name '.git' ! -name 'bin' ! -name 'node_modules' ! -name '.' -exec cp -r {} "$TEMP_DIR/" \;

  shopify theme pull --theme "$THEME_ID" --store "$STORE" --path "$TEMP_DIR" "${PULL_ARGS[@]}" 2>&1

  echo ""
  echo "[3/4] Changes that Shopify would apply:"
  echo "---------------------------------------"
  diff -rq . "$TEMP_DIR" --exclude=".git" --exclude="bin" --exclude="node_modules" 2>/dev/null | head -50 || echo "  (no differences)"
  echo ""
  echo "[4/4] Dry run complete. No files were modified."

  # Restore stash if we made one
  if [ "$HAS_CHANGES" = true ]; then
    git stash pop --quiet
    echo "      Local stash restored."
  fi
  exit 0
fi

echo "[2/4] Pulling from Shopify (theme $THEME_ID)..."
shopify theme pull --theme "$THEME_ID" --store "$STORE" "${PULL_ARGS[@]}" 2>&1
echo ""

# Step 3: Show what changed
echo "[3/4] Changes from Shopify pull:"
echo "--------------------------------"
DIFF_OUTPUT=$(git diff --stat)

if [ -z "$DIFF_OUTPUT" ]; then
  echo "  No changes from remote."
  echo ""
  # Restore stash
  if [ "$HAS_CHANGES" = true ]; then
    echo "[4/4] Restoring your local changes..."
    git stash pop
    echo "      Done. Your local changes are intact."
  else
    echo "[4/4] Nothing to do."
  fi
  exit 0
fi

echo "$DIFF_OUTPUT"
echo ""

# Step 4: Let user decide
echo "[4/4] What do you want to do?"
echo ""
echo "  a) Accept ALL Shopify changes (keep pull result)"
echo "  r) Reject ALL Shopify changes (restore pre-pull state)"
echo "  f) Review file-by-file (choose per file)"
echo "  d) Show full diff first, then decide"
echo ""
read -rp "Choice [a/r/f/d]: " CHOICE

case "$CHOICE" in
  a|A)
    echo ""
    echo "Accepting all Shopify changes..."
    git add -A
    git commit -m "chore: pull from Shopify $(date +%Y-%m-%d)"
    if [ "$HAS_CHANGES" = true ]; then
      echo "Restoring your local changes on top..."
      git stash pop || {
        echo ""
        echo "WARNING: Merge conflict when restoring local changes."
        echo "Run 'git stash show -p' to see your stashed changes."
        echo "Resolve manually, then 'git stash drop'."
      }
    fi
    echo "Done."
    ;;

  r|R)
    echo ""
    echo "Rejecting all Shopify changes..."
    git checkout -- .
    git clean -fd --quiet
    if [ "$HAS_CHANGES" = true ]; then
      git stash pop
    fi
    echo "Done. Local state restored."
    ;;

  f|F)
    echo ""
    CHANGED_FILES=$(git diff --name-only)
    for FILE in $CHANGED_FILES; do
      echo "--- $FILE ---"
      git diff -- "$FILE" | head -30
      echo ""
      read -rp "  Keep Shopify version? [y/n/s(kip)]: " FILE_CHOICE
      case "$FILE_CHOICE" in
        y|Y) echo "  Keeping Shopify version of $FILE" ;;
        n|N) git checkout -- "$FILE"; echo "  Restored local version of $FILE" ;;
        *)   echo "  Skipped (Shopify version kept in working tree)" ;;
      esac
      echo ""
    done
    # Commit accepted changes
    if ! git diff --quiet; then
      git add -A
      git commit -m "chore: selective pull from Shopify $(date +%Y-%m-%d)"
    fi
    if [ "$HAS_CHANGES" = true ]; then
      echo "Restoring your local changes on top..."
      git stash pop || echo "WARNING: Merge conflict. Resolve manually."
    fi
    echo "Done."
    ;;

  d|D)
    echo ""
    git diff
    echo ""
    read -rp "Accept these changes? [y/n]: " FINAL
    if [[ "$FINAL" == "y" || "$FINAL" == "Y" ]]; then
      git add -A
      git commit -m "chore: pull from Shopify $(date +%Y-%m-%d)"
      if [ "$HAS_CHANGES" = true ]; then
        git stash pop || echo "WARNING: Merge conflict. Resolve manually."
      fi
    else
      git checkout -- .
      git clean -fd --quiet
      if [ "$HAS_CHANGES" = true ]; then
        git stash pop
      fi
      echo "Rejected. Local state restored."
    fi
    ;;

  *)
    echo "Unknown choice. Leaving working tree as-is."
    echo "Your stashed changes (if any) are still in 'git stash list'."
    ;;
esac
