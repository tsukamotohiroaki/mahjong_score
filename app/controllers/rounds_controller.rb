class RoundsController < ApplicationController
  def new
    @game = Game.find(params[:game_id])
    @players = @game.players.order(:created_at)
    @round_number = params[:round_number]
  end

  def create
    game = Game.find(params[:game_id])
    redirect_to game_path(game)
  end
end
