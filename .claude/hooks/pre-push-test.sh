#!/bin/bash
# git push 前に RSpec を実行し、失敗したら push をブロック

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if echo "$COMMAND" | grep -q "git push"; then
  echo "RSpec を実行してから push します..." >&2

  if ! docker compose -f "$CLAUDE_PROJECT_DIR/docker-compose.yml" exec -T web bundle exec rspec 2>&1; then
    echo "" >&2
    echo "テストが失敗しました。push をブロックします。" >&2
    echo "先にテストを修正してください。" >&2
    exit 2
  fi

  echo "テストがパスしました。push を続行します。" >&2
fi

exit 0
