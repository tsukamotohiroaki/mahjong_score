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
    # 非 root など /var/log に書けない環境では /tmp に逃がす（案内するパスと実際の出力先を一致させる）
    DOCKERD_LOG=/var/log/dockerd.log
    # 2>/dev/null を先に置く（リダイレクトは左から処理されるため、後ろだとエラーが漏れる）
    : 2>/dev/null >"$DOCKERD_LOG" || DOCKERD_LOG=/tmp/dockerd.log
    setsid dockerd >"$DOCKERD_LOG" 2>&1 < /dev/null &
    # 起動は実測で1〜2秒。序盤を細かく見て成功を早く拾い、待ち続けても10秒で打ち切る
    STARTED=false
    for _ in $(seq 1 10); do
      if docker info >/dev/null 2>&1; then
        STARTED=true
        break
      fi
      sleep 0.2
    done
    if [ "$STARTED" = "false" ]; then
      for _ in $(seq 1 8); do
        if docker info >/dev/null 2>&1; then
          STARTED=true
          break
        fi
        sleep 1
      done
    fi
    if [ "$STARTED" = "true" ]; then
      echo "停止していたため自動起動しました"
    else
      echo "10秒以内に起動を確認できませんでした（起動途中の可能性があります。ログ: $DOCKERD_LOG）"
    fi
  fi
fi

exit 0
