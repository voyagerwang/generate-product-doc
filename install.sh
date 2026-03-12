#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="auto"
SKILL_NAME="generate-product-doc-2"
CODEX_DIR="${CODEX_HOME:-$HOME/.codex}/skills"
CLAUDE_DIR="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
TRAE_DIR="${TRAE_HOME:-$HOME/.trae}/adapters"
TOOLKIT_DIR="${GENERATE_PRODUCT_DOC_HOME:-$HOME/.generate-product-doc-2}/tools/feishu"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target)
      TARGET="$2"
      shift 2
      ;;
    --target=*)
      TARGET="${1#*=}"
      shift 1
      ;;
    --name)
      SKILL_NAME="$2"
      shift 2
      ;;
    --name=*)
      SKILL_NAME="${1#*=}"
      shift 1
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

copy_dir() {
  local src="$1"
  local dst="$2"
  mkdir -p "$(dirname "$dst")"
  rm -rf "$dst"
  cp -R "$src" "$dst"
}

install_codex() {
  copy_dir "$ROOT_DIR/codex/generate-product-doc-2" "$CODEX_DIR/$SKILL_NAME"
  echo "Installed Codex skill to: $CODEX_DIR/$SKILL_NAME"
}

install_claude() {
  copy_dir "$ROOT_DIR/claude-code/generate-product-doc-2" "$CLAUDE_DIR/$SKILL_NAME"
  echo "Installed Claude Code skill to: $CLAUDE_DIR/$SKILL_NAME"
}

install_trae() {
  copy_dir "$ROOT_DIR/trae" "$TRAE_DIR/$SKILL_NAME"
  echo "Installed Trae adapter to: $TRAE_DIR/$SKILL_NAME"
}

install_toolkit() {
  copy_dir "$ROOT_DIR/tools/feishu" "$TOOLKIT_DIR"
  echo "Installed Feishu toolkit to: $TOOLKIT_DIR"
}

case "$TARGET" in
  auto)
    installed_any=false
    if [[ -d "${CODEX_HOME:-$HOME/.codex}" || -n "${CODEX_HOME:-}" ]]; then
      install_codex
      installed_any=true
    fi
    if [[ -d "$HOME/.claude" || -n "${CLAUDE_SKILLS_DIR:-}" ]]; then
      install_claude
      installed_any=true
    fi
    if [[ -d "${TRAE_HOME:-$HOME/.trae}" || -n "${TRAE_HOME:-}" ]]; then
      install_trae
      installed_any=true
    fi
    if [[ "$installed_any" == false ]]; then
      echo "No known target home found. Use --target codex|claude|trae|all" >&2
      exit 1
    fi
    install_toolkit
    ;;
  codex)
    install_codex
    install_toolkit
    ;;
  claude)
    install_claude
    install_toolkit
    ;;
  trae)
    install_trae
    install_toolkit
    ;;
  all)
    install_codex
    install_claude
    install_trae
    install_toolkit
    ;;
  *)
    echo "Unsupported target: $TARGET" >&2
    exit 1
    ;;
esac

echo "Done."
