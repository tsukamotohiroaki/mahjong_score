class RoundsController < ApplicationController
  def new
    @game = Game.find(params[:game_id])
    @players = @game.players.order(:created_at)
    @round_number = params[:round_number].presence&.to_i || @game.rounds.maximum(:round_number).to_i + 1
    @score_values = {}
  end

  def create
    @game = Game.find(params[:game_id])
    @players = @game.players.order(:created_at)
    @score_values = params.fetch(:scores, {})
    requested_round_number = params[:round_number].presence&.to_i
    @round_number = requested_round_number || @game.rounds.maximum(:round_number).to_i + 1
    form = RoundScoreForm.new(
      players: @players,
      raw_scores: @players.to_h { |player| [player.id, @score_values[player.id.to_s]] }
    )

    if form.invalid?
      @error_message = "入力内容を確認してください"
      return render :new, status: 422
    end

    round = @game.rounds.find_or_initialize_by(round_number: @round_number)

    ActiveRecord::Base.transaction do
      round.save! if round.new_record?
      @players.each do |player|
        score = round.scores.find_or_initialize_by(player: player)
        score.update!(point: form.units_by_player_id[player.id] * 100)
      end
    end

    redirect_to game_path(@game)
  end
end
