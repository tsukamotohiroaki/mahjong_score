require "rails_helper"

RSpec.describe "Api::V1::Rounds", type: :request do
  let(:game) { create(:game) }
  let!(:players) { %w[Alice Bob Carol Dave].map { |n| create(:player, game: game, name: n) } }
  let(:valid_scores) do
    [
      { player_id: players[0].id, point: 350 },
      { player_id: players[1].id, point: 250 },
      { player_id: players[2].id, point: 200 },
      { player_id: players[3].id, point: 200 }
    ]
  end

  describe "POST /api/v1/games/:game_id/rounds" do
    context "正しい点数の場合" do
      it "Roundを作成し点数を100倍で保存、201でRoundDetailを返す" do
        expect {
          post "/api/v1/games/#{game.id}/rounds", params: { round_number: 1, scores: valid_scores }, as: :json
        }.to change(Round, :count).by(1).and change(Score, :count).by(4)

        expect(response).to have_http_status(201)
        round = Round.last
        expect(round.scores.find_by(player: players[0]).point).to eq(35000)

        json = JSON.parse(response.body)
        expect(json["round_number"]).to eq(1)
        expect(json["scores"].size).to eq(4)
        score = json["scores"].find { |s| s["player_id"] == players[0].id }
        expect(score).to have_key("ranking_score")
        expect(score).to have_key("rank")
        expect(score).not_to have_key("point") # 生点数は返さない
      end
    end

    context "round_number を省略した場合" do
      it "既存最大 + 1 で採番する" do
        create(:round, game: game, round_number: 3)

        post "/api/v1/games/#{game.id}/rounds", params: { scores: valid_scores }, as: :json

        expect(response).to have_http_status(201)
        expect(Round.last.round_number).to eq(4)
      end
    end

    context "既存の round_number を指定した場合" do
      it "スコアを上書きする" do
        round = create(:round, game: game, round_number: 1)
        players.each { |player| create(:score, round: round, player: player, point: 10000) }

        expect {
          post "/api/v1/games/#{game.id}/rounds", params: { round_number: 1, scores: valid_scores }, as: :json
        }.not_to change(Round, :count)

        expect(round.reload.scores.find_by(player: players[0]).point).to eq(35000)
      end
    end

    context "合計が 1000 でない場合" do
      it "422を返し作成しない" do
        bad = valid_scores.dup
        bad[3] = { player_id: players[3].id, point: 100 }

        expect {
          post "/api/v1/games/#{game.id}/rounds", params: { round_number: 1, scores: bad }, as: :json
        }.not_to change(Round, :count)

        expect(response).to have_http_status(422)
        json = JSON.parse(response.body)
        expect(json["errors"]).to be_present
      end
    end

    context "範囲外の点数の場合" do
      it "422を返し作成しない" do
        bad = valid_scores.dup
        bad[2] = { player_id: players[2].id, point: 1001 }

        expect {
          post "/api/v1/games/#{game.id}/rounds", params: { round_number: 1, scores: bad }, as: :json
        }.not_to change(Round, :count)

        expect(response).to have_http_status(422)
      end
    end

    context "4人分の点数が揃っていない場合" do
      it "422を返し作成しない" do
        incomplete = valid_scores[0..2]

        expect {
          post "/api/v1/games/#{game.id}/rounds", params: { round_number: 1, scores: incomplete }, as: :json
        }.not_to change(Round, :count)

        expect(response).to have_http_status(422)
      end
    end

    context "ゲームが存在しない場合" do
      it "404を返す" do
        post "/api/v1/games/0/rounds", params: { round_number: 1, scores: valid_scores }, as: :json

        expect(response).to have_http_status(404)
        json = JSON.parse(response.body)
        expect(json["errors"]).to include("ゲームが見つかりません")
      end
    end
  end
end
