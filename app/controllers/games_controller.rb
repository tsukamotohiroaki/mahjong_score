class GamesController < ApplicationController
  def new
  end

  def create
    ActiveRecord::Base.transaction do
      game = Game.create!(rule_type: "default")
      params[:players].each { |name| game.players.create!(name: name) }
      redirect_to game_path(game)
    end
  rescue ActiveRecord::RecordInvalid
    redirect_to new_game_path
  end
end
