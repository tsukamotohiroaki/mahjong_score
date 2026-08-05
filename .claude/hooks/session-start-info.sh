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

# クラウド環境（Linux・systemdなし）では dockerd が自動起動しないため、ここで起動する。
# macOS では Docker Desktop がデーモンを管理するので絶対に干渉しない（Linux 以外は何もしない）。
if [ "$(uname)" = "Linux" ] && command -v dockerd >/dev/null 2>&1; then
  echo ""
  echo "=== Docker デーモン ==="
  if docker info >/dev/null 2>&1; then
    echo "起動済み"
  else
    setsid dockerd >/var/log/dockerd.log 2>&1 < /dev/null &
    STARTED=false
    for _ in $(seq 1 30); do
      if docker info >/dev/null 2>&1; then
        STARTED=true
        break
      fi
      sleep 1
    done
    if [ "$STARTED" = "true" ]; then
      echo "停止していたため自動起動しました"
    else
      echo "起動に失敗しました（ログ: /var/log/dockerd.log）"
    fi
  fi
fi

exit 0
