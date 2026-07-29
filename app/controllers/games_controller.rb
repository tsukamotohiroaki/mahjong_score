class GamesController < ApplicationController
  def show
    @game = Game.find(params[:id])
    @players = @game.players.order(:created_at)
    @rounds = @game.rounds.includes(:scores).order(:round_number)
    @ranking_scores = @rounds.each_with_object({}) do |round, hash|
      hash[round.id] = @game.calculate_ranking_scores(round)
    end
  end

  def new
  end

  def create
    game = Game.create_with_players!(game_params, params[:players])
    redirect_to game_path(game)
  rescue ActiveRecord::RecordInvalid
    redirect_to new_game_path
  end

  private

  def game_params
    if params[:game].present?
      params.require(:game).permit(:mochi_ten, :kaeshi_ten, :rank_1_bonus, :rank_2_bonus, :rank_3_bonus, :rank_4_bonus)
    else
      {}
    end
  end
end
