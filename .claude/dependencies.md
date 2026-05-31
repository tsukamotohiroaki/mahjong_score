# 依存マップ（TDAD: Test-Driven Agentic Development）

コード変更時に確認すべきテストの一覧。
変更対象のファイルに対して、直接テストだけでなく間接的に影響を受けるテストも列挙する。

## app/models/game.rb

Game は Player・Round の親モデルであり、順位点計算ロジックを持つ。

- `spec/models/game_spec.rb`（直接）
- `spec/models/player_spec.rb`（has_many :players）
- `spec/models/round_spec.rb`（has_many :rounds）
- `spec/models/score_spec.rb`（calculate_ranking_scores が Score を参照）
- `spec/requests/games_spec.rb`（Game の CRUD）
- `spec/requests/rounds_spec.rb`（Round 作成時に Game のルール設定を使用）
- `e2e/home.spec.ts`（トップページからゲーム作成への導線）
- `e2e/score_input.spec.ts`（点数入力は Game 配下の Round/Score に依存）

## app/models/player.rb

Player は Game に従属し、Score と紐づく。

- `spec/models/player_spec.rb`（直接）
- `spec/models/game_spec.rb`（has_many :players）
- `spec/models/score_spec.rb`（belongs_to :player）
- `spec/requests/games_spec.rb`（ゲーム作成時に Player も作成）
- `e2e/score_input.spec.ts`（点数入力画面に Player 名が表示される）

## app/models/round.rb

Round は Game に従属し、Score を持つ。

- `spec/models/round_spec.rb`（直接）
- `spec/models/game_spec.rb`（has_many :rounds、calculate_ranking_scores）
- `spec/models/score_spec.rb`（belongs_to :round）
- `spec/requests/rounds_spec.rb`（Round の CRUD）
- `e2e/score_input.spec.ts`（点数入力 → Round/Score 作成）

## app/models/score.rb

Score は Round・Player に従属する。

- `spec/models/score_spec.rb`（直接）
- `spec/models/round_spec.rb`（has_many :scores）
- `spec/models/player_spec.rb`（has_many :scores）
- `spec/models/game_spec.rb`（calculate_ranking_scores が Score を使用）
- `spec/requests/rounds_spec.rb`（Round 作成時に Score も作成）
- `e2e/score_input.spec.ts`（点数入力 → Score 作成）
