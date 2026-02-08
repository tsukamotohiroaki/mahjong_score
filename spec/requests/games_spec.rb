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
end
