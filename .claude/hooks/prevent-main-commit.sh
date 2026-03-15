#!/bin/bash
# main ブランチへの直接コミット・push をブロック

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if echo "$COMMAND" | grep -qE "git (commit|push)"; then
  CURRENT_BRANCH=$(git -C "$CLAUDE_PROJECT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null)

  if [ "$CURRENT_BRANCH" = "main" ]; then
    echo "Error: main ブランチへの直接 $(echo "$COMMAND" | grep -oE 'commit|push') は禁止されています。" >&2
    echo "先に feature ブランチを切ってください: git checkout -b feature/your-feature" >&2
    exit 2
  fi
fi

exit 0
