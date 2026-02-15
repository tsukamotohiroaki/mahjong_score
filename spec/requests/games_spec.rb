require 'rails_helper'

RSpec.describe "Games", type: :request do
  describe "POST /games" do
    context "4人分のプレイヤー名が入力された場合" do
      let(:players) { ["Player1", "Player2", "Player3", "Player4"] }

      it "Game が1件作成される" do
        expect {
          post games_path, params: { players: players }
        }.to change(Game, :count).by(1)
      end

      it "Player が4件作成され、Game に紐づいている" do
        expect {
          post games_path, params: { players: players }
        }.to change(Player, :count).by(4)

        game = Game.last
        expect(game.players.map(&:name)).to eq(players)
      end

      it "スコア一覧画面にリダイレクトする" do
        post games_path, params: { players: players }
        game = Game.last
        expect(response).to redirect_to(game_path(game))
      end

      it "デフォルトのルール設定で Game が作成される" do
        post games_path, params: { players: players }
        game = Game.last
        expect(game.mochi_ten).to eq 25000
        expect(game.kaeshi_ten).to eq 30000
        expect(game.rank_1_bonus).to eq 50
        expect(game.rank_2_bonus).to eq 10
        expect(game.rank_3_bonus).to eq(-10)
        expect(game.rank_4_bonus).to eq(-30)
      end
    end

    context "カスタムルールが指定された場合" do
      let(:players) { ["Player1", "Player2", "Player3", "Player4"] }
      let(:rule_params) do
        { mochi_ten: 30000, kaeshi_ten: 30000,
          rank_1_bonus: 30, rank_2_bonus: 10, rank_3_bonus: -10, rank_4_bonus: -30 }
      end

      it "指定したルール設定で Game が作成される" do
        post games_path, params: { players: players, game: rule_params }
        game = Game.last
        expect(game.mochi_ten).to eq 30000
        expect(game.kaeshi_ten).to eq 30000
        expect(game.rank_1_bonus).to eq 30
      end
    end

    context "プレイヤー名に空欄がある場合" do
      let(:players) { ["Player1", "", "Player3", "Player4"] }

      it "Game と Player が作成されない" do
        expect {
          post games_path, params: { players: players }
        }.to change(Game, :count).by(0).and change(Player, :count).by(0)
      end
    end
  end

  describe "GET /games/:id" do
    let(:game) { create(:game) }
    let!(:players) do
      %w[Alice Bob Carol Dave].map { |name| create(:player, game: game, name: name) }
    end

    context "半荘データがない場合" do
      it "ステータス200が返る" do
        get game_path(game)
        expect(response).to have_http_status(200)
      end

      it "プレイヤー名が全員表示される" do
        get game_path(game)
        %w[Alice Bob Carol Dave].each do |name|
          expect(response.body).to include(name)
        end
      end

      it "行番号が点数入力画面へのリンクになっている" do
        get game_path(game)
        (1..10).each do |num|
          expect(response.body).to include(new_game_round_path(game, round_number: num))
        end
      end

      it "合計行が表示される" do
        get game_path(game)
        expect(response.body).to include("合計")
      end
    end

    context "半荘データがある場合" do
      let!(:round1) { create(:round, game: game, round_number: 1) }
      let!(:round2) { create(:round, game: game, round_number: 2) }

      before do
        # Round1: Alice:30000(1位) Bob:25000(2位タイ) Carol:25000(2位タイ) Dave:20000(4位)
        [30000, 25000, 25000, 20000].each_with_index do |point, i|
          create(:score, round: round1, player: players[i], point: point)
        end
        # Round2: Alice:40000(1位) Bob:20000(3位) Carol:25000(2位) Dave:15000(4位)
        [40000, 20000, 25000, 15000].each_with_index do |point, i|
          create(:score, round: round2, player: players[i], point: point)
        end
      end

      it "各半荘の順位点が表示される" do
        get game_path(game)
        # Round1 Alice: (30000-30000)/1000 + 50 = 50.0
        expect(response.body).to include("50.0")
        # Round2 Alice: (40000-30000)/1000 + 50 = 60.0
        expect(response.body).to include("60.0")
      end

      it "半荘が round_number 昇順で表示される" do
        get game_path(game)
        expect(response.body.index("50.0")).to be < response.body.index("60.0")
      end

      it "合計行に順位点の合計が表示される" do
        get game_path(game)
        expect(response.body).to include("110.0")  # Alice: 50.0 + 60.0
      end

      it "マイナスの順位点に negative クラスが付与される" do
        get game_path(game)
        expect(response.body).to include('class="negative"')
      end
    end
  end
end
