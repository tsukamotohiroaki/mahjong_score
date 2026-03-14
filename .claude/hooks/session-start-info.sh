#!/bin/bash
# セッション開始時に git 状態とリモート差分を表示

cd "$CLAUDE_PROJECT_DIR" || exit 0

echo "=== Git Status ==="
git status --short

echo ""
echo "=== Current Branch ==="
git rev-parse --abbrev-ref HEAD

echo ""
echo "=== リモートとの差分 (origin/main との比較) ==="
git fetch -q 2>/dev/null || true
DIFF=$(git log HEAD..origin/main --oneline 2>/dev/null)
if [ -n "$DIFF" ]; then
  echo "$DIFF"
else
  echo "差分なし（最新状態）"
fi

exit 0
