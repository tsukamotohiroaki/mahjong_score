module Api
  module V1
    class RoundsController < Api::V1::ApplicationController
      def create
        game = Game.find(params[:game_id])

        form = RoundScoreForm.new(
          players: game.players,
          raw_scores: score_entries.to_h { |entry| [entry[:player_id].to_i, entry[:point]] }
        )
        return render json: { errors: form.errors.full_messages }, status: :unprocessable_entity if form.invalid?

        round = game.rounds.find_or_initialize_by(round_number: next_round_number(game))
        ActiveRecord::Base.transaction do
          round.save! if round.new_record?
          game.players.each do |player|
            score = round.scores.find_or_initialize_by(player: player)
            score.update!(point: form.units_by_player_id[player.id] * 100)
          end
        end

        render json: round_detail(game, round.reload), status: :created
      end

      private

      def score_entries
        params.fetch(:scores, [])
      end

      def next_round_number(game)
        params[:round_number].presence&.to_i || game.rounds.maximum(:round_number).to_i + 1
      end
    end
  end
end
