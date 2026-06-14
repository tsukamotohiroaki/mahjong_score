module Api
  module V1
    # JSON API 共通の基底コントローラー。
    # 既存の MPA（HTML）コントローラーには影響しない。
    class ApplicationController < ::ApplicationController
      skip_forgery_protection

      rescue_from ActiveRecord::RecordNotFound do
        render json: { errors: ["ゲームが見つかりません"] }, status: :not_found
      end

      private

      # ラウンド1件を JSON 用ハッシュに変換する。
      # 生点数は返さず、順位点(ranking_score)と順位(rank)のみを返す。
      def round_detail(game, round)
        ranking = game.calculate_ranking_scores(round)
        {
          id: round.id,
          round_number: round.round_number,
          scores: round.scores.map do |score|
            data = ranking[score.player_id] || {}
            {
              player_id: score.player_id,
              ranking_score: data[:score],
              rank: data[:rank]
            }
          end
        }
      end
    end
  end
end
