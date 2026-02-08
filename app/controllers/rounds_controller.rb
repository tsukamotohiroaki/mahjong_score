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
    min_unit = -1000
    max_unit = 1000

    score_units = @players.map do |player|
      raw = @score_values[player.id.to_s]
      next if raw.blank?
      next unless raw.match?(/\A-?\d+\z/)

      raw.to_i
    end

    if score_units.any?(&:nil?)
      @error_message = "入力内容を確認してください"
      return render :new, status: 422
    end

    if score_units.any? { |unit| unit < min_unit || unit > max_unit }
      @error_message = "入力内容を確認してください"
      return render :new, status: 422
    end

    if score_units.sum != 1000
      @error_message = "入力内容を確認してください"
      return render :new, status: 422
    end

    round = @game.rounds.find_or_initialize_by(round_number: @round_number)

    ActiveRecord::Base.transaction do
      round.save! if round.new_record?
      @players.each_with_index do |player, index|
        score = round.scores.find_or_initialize_by(player: player)
        score.update!(point: score_units[index] * 100)
      end
    end

    redirect_to game_path(@game)
  end
end
