require "rails_helper"

RSpec.describe "Api::V1::Games", type: :request do
  describe "GET /api/v1/games" do
    it "ゲーム一覧をJSONで返す" do
      game = create(:game)
      %w[Alice Bob Carol Dave].each { |n| create(:player, game: game, name: n) }
      create(:round, game: game, round_number: 1)

      get "/api/v1/games"

      expect(response).to have_http_status(200)
      json = JSON.parse(response.body)
      expect(json["games"]).to be_an(Array)
      summary = json["games"].first
      expect(summary["id"]).to eq(game.id)
      expect(summary["mochi_ten"]).to eq(game.mochi_ten)
      expect(summary["kaeshi_ten"]).to eq(game.kaeshi_ten)
      expect(summary["players"].map { |p| p["name"] }).to eq(%w[Alice Bob Carol Dave])
      expect(summary["rounds_count"]).to eq(1)
      expect(summary).to have_key("created_at")
    end
  end

  describe "GET /api/v1/games/:id" do
    let(:game) { create(:game) }
    let!(:players) { %w[Alice Bob Carol Dave].map { |n| create(:player, game: game, name: n) } }

    context "ゲームが存在する場合" do
      let!(:round1) { create(:round, game: game, round_number: 1) }

      before do
        # Alice:30000(1位) Bob:25000(2位タイ) Carol:25000(2位タイ) Dave:20000(4位)
        [30000, 25000, 25000, 20000].each_with_index do |pt, i|
          create(:score, round: round1, player: players[i], point: pt)
        end
      end

      it "プレイヤー・ラウンド・順位点を含む詳細をJSONで返す" do
        get "/api/v1/games/#{game.id}"

        expect(response).to have_http_status(200)
        json = JSON.parse(response.body)
        expect(json["id"]).to eq(game.id)
        expect(json["rank_1_bonus"]).to eq(game.rank_1_bonus)
        expect(json["players"].map { |p| p["name"] }).to eq(%w[Alice Bob Carol Dave])

        round = json["rounds"].first
        expect(round["round_number"]).to eq(1)
        score = round["scores"].find { |s| s["player_id"] == players[0].id }
        # Alice 30000: (30000-30000)/1000 + 50 = 50.0, rank 1
        expect(score["ranking_score"]).to eq(50.0)
        expect(score["rank"]).to eq(1)
        expect(score).not_to have_key("point") # 生点数は返さない
      end
    end

    context "ゲームが存在しない場合" do
      it "404とエラーJSONを返す" do
        get "/api/v1/games/0"

        expect(response).to have_http_status(404)
        json = JSON.parse(response.body)
        expect(json["errors"]).to include("ゲームが見つかりません")
      end
    end
  end

  describe "POST /api/v1/games" do
    let(:valid_params) do
      {
        mochi_ten: 25000, kaeshi_ten: 30000,
        rank_1_bonus: 50, rank_2_bonus: 10, rank_3_bonus: -10, rank_4_bonus: -30,
        players: %w[Alice Bob Carol Dave]
      }
    end

    context "正しいパラメータの場合" do
      it "ゲームとプレイヤーを作成し201でGameDetailを返す" do
        expect {
          post "/api/v1/games", params: valid_params, as: :json
        }.to change(Game, :count).by(1).and change(Player, :count).by(4)

        expect(response).to have_http_status(201)
        json = JSON.parse(response.body)
        expect(json["mochi_ten"]).to eq(25000)
        expect(json["players"].map { |p| p["name"] }).to eq(%w[Alice Bob Carol Dave])
        expect(json["rounds"]).to eq([])
      end
    end

    context "順位点がゼロサムでない場合" do
      it "422とエラーJSONを返し作成しない" do
        params = valid_params.merge(rank_4_bonus: -10)

        expect {
          post "/api/v1/games", params: params, as: :json
        }.not_to change(Game, :count)

        expect(response).to have_http_status(422)
        json = JSON.parse(response.body)
        expect(json["errors"]).to be_present
      end
    end

    context "プレイヤー名が重複している場合" do
      it "422を返し作成しない" do
        params = valid_params.merge(players: %w[Alice Alice Carol Dave])

        expect {
          post "/api/v1/games", params: params, as: :json
        }.not_to change(Game, :count)

        expect(response).to have_http_status(422)
      end
    end
  end
end
