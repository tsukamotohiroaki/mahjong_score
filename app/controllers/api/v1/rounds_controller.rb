module Api
  module V1
    class RoundsController < Api::V1::ApplicationController
      MIN_UNIT = -1000
      MAX_UNIT = 1000
      REQUIRED_TOTAL = 1000

      def create
        game = Game.find(params[:game_id])

        errors = validation_errors(game)
        return render json: { errors: errors }, status: :unprocessable_entity if errors.any?

        round = game.rounds.find_or_initialize_by(round_number: next_round_number(game))
        ActiveRecord::Base.transaction do
          round.save! if round.new_record?
          game.players.each do |player|
            score = round.scores.find_or_initialize_by(player: player)
            score.update!(point: score_map[player.id] * 100)
          end
        end

        render json: round_detail(game, round.reload), status: :created
      end

      private

      def score_entries
        params.fetch(:scores, [])
      end

      # player_id => 百点棒単位の点数（整数）。整数に変換できない値は nil。
      def score_map
        @score_map ||= score_entries.each_with_object({}) do |entry, hash|
          raw = entry[:point]
          hash[entry[:player_id].to_i] = raw.to_s.match?(/\A-?\d+\z/) ? raw.to_i : nil
        end
      end

      def next_round_number(game)
        params[:round_number].presence&.to_i || game.rounds.maximum(:round_number).to_i + 1
      end

      def validation_errors(game)
        units = game.players.map { |player| score_map[player.id] }

        return ["点数は全プレイヤー分を整数で入力してください"] if units.any?(&:nil?)
        return ["点数は #{MIN_UNIT}〜#{MAX_UNIT} の範囲で入力してください"] if units.any? { |u| u < MIN_UNIT || u > MAX_UNIT }
        return ["点数の合計が #{REQUIRED_TOTAL} になりません"] if units.sum != REQUIRED_TOTAL

        []
      end
    end
  end
end
