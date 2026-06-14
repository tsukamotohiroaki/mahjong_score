module Api
  module V1
    class GamesController < Api::V1::ApplicationController
      def index
        games = Game.includes(:players, :rounds).order(:created_at)
        render json: { games: games.map { |game| game_summary(game) } }
      end

      def show
        game = Game.find(params[:id])
        render json: game_detail(game)
      end

      def create
        game = nil
        ActiveRecord::Base.transaction do
          game = Game.create!(game_params)
          player_names.each { |name| game.players.create!(name: name) }
        end
        render json: game_detail(game), status: :created
      rescue ActiveRecord::RecordInvalid => e
        render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
      end

      private

      def game_params
        params.permit(:mochi_ten, :kaeshi_ten, :rank_1_bonus, :rank_2_bonus, :rank_3_bonus, :rank_4_bonus)
      end

      def player_names
        params.fetch(:players, [])
      end

      def game_summary(game)
        {
          id: game.id,
          mochi_ten: game.mochi_ten,
          kaeshi_ten: game.kaeshi_ten,
          players: serialize_players(game),
          rounds_count: game.rounds.size,
          created_at: game.created_at
        }
      end

      def game_detail(game)
        {
          id: game.id,
          mochi_ten: game.mochi_ten,
          kaeshi_ten: game.kaeshi_ten,
          rank_1_bonus: game.rank_1_bonus,
          rank_2_bonus: game.rank_2_bonus,
          rank_3_bonus: game.rank_3_bonus,
          rank_4_bonus: game.rank_4_bonus,
          players: serialize_players(game),
          rounds: game.rounds.includes(:scores).order(:round_number).map { |round| round_detail(game, round) },
          created_at: game.created_at
        }
      end

      def serialize_players(game)
        game.players.sort_by(&:created_at).map { |player| { id: player.id, name: player.name } }
      end
    end
  end
end
