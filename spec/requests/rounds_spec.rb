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
    let!(:players) do
      %w[Alice Bob Carol Dave].map { |name| create(:player, game: game, name: name) }
    end
    let(:scores_params) do
      {
        players[0].id.to_s => "250",
        players[1].id.to_s => "300",
        players[2].id.to_s => "200",
        players[3].id.to_s => "250"
      }
    end

    it "Round が1件作成される" do
      expect {
        post game_rounds_path(game), params: { round_number: 1, scores: scores_params }
      }.to change(Round, :count).by(1)
    end

    it "Score が4件作成される" do
      expect {
        post game_rounds_path(game), params: { round_number: 1, scores: scores_params }
      }.to change(Score, :count).by(4)
    end

    it "round_number が1で保存される" do
      post game_rounds_path(game), params: { round_number: 1, scores: scores_params }
      expect(Round.last.round_number).to eq(1)
    end

    it "入力値を100倍して保存する" do
      post game_rounds_path(game), params: { round_number: 1, scores: scores_params }
      round = Round.last
      players.each do |player|
        expect(round.scores.find_by(player: player).point).to eq(scores_params[player.id.to_s].to_i * 100)
      end
    end

    it "既存最大値 + 1 の round_number になる" do
      create(:round, game: game, round_number: 3)
      post game_rounds_path(game), params: { scores: scores_params }
      expect(Round.last.round_number).to eq(4)
    end

    it "既存の round を上書きできる" do
      round = create(:round, game: game, round_number: 1)
      players.each do |player|
        create(:score, round: round, player: player, point: 10000)
      end

      expect {
        post game_rounds_path(game), params: { round_number: 1, scores: scores_params }
      }.not_to change(Round, :count)

      expect(round.reload.scores.find_by(player: players[0]).point).to eq(25000)
      expect(round.reload.scores.find_by(player: players[1]).point).to eq(30000)
    end

    it "4人分の点数が揃っていない場合は保存しない" do
      incomplete_scores = scores_params.except(players[3].id.to_s)

      expect {
        post game_rounds_path(game), params: { round_number: 1, scores: incomplete_scores }
      }.not_to change(Round, :count)

      expect(response).to have_http_status(422)
      expect(response.body).to include("入力内容を確認してください")
    end

    it "合計が100000点でない場合は保存しない" do
      invalid_scores = scores_params.merge(players[3].id.to_s => "100")

      expect {
        post game_rounds_path(game), params: { round_number: 1, scores: invalid_scores }
      }.not_to change(Round, :count)

      expect(response).to have_http_status(422)
      expect(response.body).to include("入力内容を確認してください")
    end

    it "入力範囲外の点数は保存しない" do
      out_of_range_scores = scores_params.merge(players[2].id.to_s => "1001")

      expect {
        post game_rounds_path(game), params: { round_number: 1, scores: out_of_range_scores }
      }.not_to change(Round, :count)

      expect(response).to have_http_status(422)
      expect(response.body).to include("入力内容を確認してください")
    end

    it "スコア一覧にリダイレクトする" do
      post game_rounds_path(game), params: { round_number: 1, scores: scores_params }
      expect(response).to redirect_to(game_path(game))
    end
  end
end
