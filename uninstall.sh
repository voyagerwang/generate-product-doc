#!/usr/bin/env bash
set -euo pipefail

TARGET="all"
SKILL_NAME="generate-product-doc-2"
CODEX_DIR="${CODEX_HOME:-$HOME/.codex}/skills/$SKILL_NAME"
CLAUDE_DIR="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}/$SKILL_NAME"
TRAE_DIR="${TRAE_HOME:-$HOME/.trae}/adapters/$SKILL_NAME"
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
      CODEX_DIR="${CODEX_HOME:-$HOME/.codex}/skills/$SKILL_NAME"
      CLAUDE_DIR="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}/$SKILL_NAME"
      TRAE_DIR="${TRAE_HOME:-$HOME/.trae}/adapters/$SKILL_NAME"
      shift 2
      ;;
    --name=*)
      SKILL_NAME="${1#*=}"
      CODEX_DIR="${CODEX_HOME:-$HOME/.codex}/skills/$SKILL_NAME"
      CLAUDE_DIR="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}/$SKILL_NAME"
      TRAE_DIR="${TRAE_HOME:-$HOME/.trae}/adapters/$SKILL_NAME"
      shift 1
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

remove_if_exists() {
  local p="$1"
  if [[ -e "$p" ]]; then
    rm -rf "$p"
    echo "Removed: $p"
  fi
}

case "$TARGET" in
  codex)
    remove_if_exists "$CODEX_DIR"
    ;;
  claude)
    remove_if_exists "$CLAUDE_DIR"
    ;;
  trae)
    remove_if_exists "$TRAE_DIR"
    ;;
  all)
    remove_if_exists "$CODEX_DIR"
    remove_if_exists "$CLAUDE_DIR"
    remove_if_exists "$TRAE_DIR"
    remove_if_exists "$TOOLKIT_DIR"
    ;;
  *)
    echo "Unsupported target: $TARGET" >&2
    exit 1
    ;;
esac
