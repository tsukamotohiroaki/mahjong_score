#!/bin/bash
# git checkout -b の前に git pull を実行する
# 失敗した場合はブランチ作成をブロックする

cmd=$(jq -r '.tool_input.command // ""')

if echo "$cmd" | grep -q 'git checkout -b'; then
  if ! git pull 2>&1; then
    echo '{"continue": false, "stopReason": "git pull に失敗しました。最新化してからブランチを切ってください。"}'
    exit 0
  fi
fi

exit 0
