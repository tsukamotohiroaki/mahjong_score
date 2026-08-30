# デバッグガイド（症状 → 原因の逆引き）

**実際に遭遇した事故だけを載せる。** 一度ハマった原因を二度調べ直さないための記録。

> 新しい事故に遭ったら1行追加する。原因が分かったときに書く（症状だけの行は作らない）。

| 症状 | 原因と対処 |
|---|---|
| 本番だけフォーム送信が全て 422 になる | CloudFront が HTTPS を終端し Rails が自身を HTTP と認識していた。`Origin` と `base_url` が食い違い CSRF 検証で拒否。`config.assume_ssl = true` で解決（[#319](https://github.com/tsukamotohiroaki/mahjong_score/issues/319)） |
| コンテナは `Up` なのにアクセスできない | `tmp/pids/server.pid` の残留で Puma が即終了。`rm -f tmp/pids/server.pid && docker compose restart web` |
| 本番で `bin/rails` が `Bundler::GemNotFound` | gem を Docker ボリュームに永続化していないため使い捨てコンテナに gem が無い。`run --rm` ではなく `exec` を使う |
| 本番でコードを変えたのに反映されない | 本番は eager load 済み。`docker-compose restart web` が必要（アセット変更時は `assets:precompile` も） |
| 再起動ポリシーの検証が通らない | `docker kill` / `docker stop` は手動停止扱いで復帰しない。`kill -9` で検証する（[#209](https://github.com/tsukamotohiroaki/mahjong_score/issues/209)） |
| 本番の frontend ビルドがディスク不足で落ちる | `--no-deps` の付け忘れ。`depends_on` の解決で不要なイメージ取得が走る |

## どのログを見るか

| 環境 | コマンド |
|---|---|
| ローカル（Rails） | `docker compose logs web -f` |
| 本番（Rails） | EC2 に SSH → `docker-compose logs web --tail 100` |
| CI（GitHub Actions） | `gh run view --log-failed` |
| E2E（Playwright） | `test-results/` のスクリーンショット・動画、`npx playwright show-report` |

起動・停止・テスト実行のコマンドは [`docs/commands.md`](commands.md)。
