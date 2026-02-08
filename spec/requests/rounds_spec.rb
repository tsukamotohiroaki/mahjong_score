require "rails_helper"

RSpec.describe "Rounds", type: :request do
  describe "GET /games/:game_id/rounds/new" do
    let(:game) { create(:game) }
    let!(:players) do
      %w[Alice Bob Carol Dave].map { |name| create(:player, game: game, name: name) }
    end

    it "ステータス200が返る" do
      get new_game_round_path(game, round_number: 1)
      expect(response).to have_http_status(200)
    end

    it "プレイヤー名が全員表示される" do
      get new_game_round_path(game, round_number: 1)
      players.each do |player|
        expect(response.body).to include(player.name)
      end
    end

    it "各プレイヤーの点数入力欄が表示される" do
      get new_game_round_path(game, round_number: 1)
      players.each do |player|
        expect(response.body).to include("scores[#{player.id}]")
      end
    end

    it "入力完了ボタンが表示される" do
      get new_game_round_path(game, round_number: 1)
      expect(response.body).to include("入力完了")
    end

    it "送信先が rounds#create になっている" do
      get new_game_round_path(game, round_number: 1)
      expect(response.body).to include(game_rounds_path(game))
    end

    it "合計行が表示される" do
      get new_game_round_path(game, round_number: 1)
      expect(response.body).to include("合計")
    end
  end

  describe "POST /games/:game_id/rounds" do
    let(:game) { create(:game) }

    it "スコア一覧にリダイレクトする" do
      post game_rounds_path(game), params: { round_number: 1, scores: {} }
      expect(response).to redirect_to(game_path(game))
    end
  end
end
