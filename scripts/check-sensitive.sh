#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

patterns=(
  '/Users/'
  'cli_[A-Za-z0-9]{16,}'
  'https://[^[:space:]]*my\.feishu\.cn/docx/[A-Za-z0-9]+'
  'FEISHU_APP_SECRET=.*[^}]'
  '2WpJRS6yBjY9pghovaUUKeLhCQJbB8cB'
)

failed=0
for pattern in "${patterns[@]}"; do
  if rg -n --pcre2 "$pattern" . --glob '!scripts/check-sensitive.sh' --glob '!README.md'; then
    echo "Found sensitive pattern: $pattern" >&2
    failed=1
  fi
done

if [[ $failed -eq 0 ]]; then
  echo "No obvious sensitive content found."
else
  exit 1
fi
