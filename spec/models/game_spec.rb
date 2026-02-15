require 'rails_helper'

RSpec.describe Game, type: :model do
  describe 'デフォルト値' do
    it 'ルール設定がデフォルト値で作成されること' do
      game = Game.new
      expect(game.mochi_ten).to eq 25000
      expect(game.kaeshi_ten).to eq 30000
      expect(game.rank_1_bonus).to eq 50
      expect(game.rank_2_bonus).to eq 10
      expect(game.rank_3_bonus).to eq(-10)
      expect(game.rank_4_bonus).to eq(-30)
    end
  end

  describe 'バリデーション' do
    context 'mochi_ten' do
      it '正の整数であれば有効' do
        game = build(:game, mochi_ten: 25000)
        expect(game).to be_valid
      end

      it '0以下はエラー' do
        game = build(:game, mochi_ten: 0)
        expect(game).not_to be_valid
      end

      it '小数はエラー' do
        game = build(:game, mochi_ten: 25000.5)
        expect(game).not_to be_valid
      end
    end

    context 'kaeshi_ten' do
      it '正の整数であれば有効' do
        game = build(:game, kaeshi_ten: 30000)
        expect(game).to be_valid
      end

      it '0以下はエラー' do
        game = build(:game, kaeshi_ten: 0)
        expect(game).not_to be_valid
      end
    end

    context '順位点のゼロサム' do
      it 'デフォルト値（オカ込み）でゼロサムが成立すること' do
        game = build(:game)
        expect(game).to be_valid
      end

      it '持ち点=返し点の場合、順位点の合計が0であれば有効' do
        game = build(:game, mochi_ten: 30000, kaeshi_ten: 30000,
                     rank_1_bonus: 30, rank_2_bonus: 10, rank_3_bonus: -10, rank_4_bonus: -30)
        expect(game).to be_valid
      end

      it 'ゼロサム条件を満たさなければエラー' do
        game = build(:game, rank_1_bonus: 50, rank_2_bonus: 10, rank_3_bonus: -10, rank_4_bonus: -20)
        expect(game).not_to be_valid
      end
    end
  end
end
