require 'rails_helper'

RSpec.describe Round, type: :model do
  describe "バリデーション" do
    it "game と round_number が揃っていれば有効" do
      round = build(:round)
      expect(round).to be_valid
    end

    it "game がなければ無効" do
      round = build(:round, game: nil)
      expect(round).to be_invalid
    end

    it "round_number がなければ無効" do
      round = build(:round, round_number: nil)
      expect(round).to be_invalid
    end

    it "同一 game 内で round_number が重複すれば無効" do
      game = create(:game)
      create(:round, game: game, round_number: 1)
      duplicate = build(:round, game: game, round_number: 1)
      expect(duplicate).to be_invalid
    end

    it "異なる game なら同じ round_number が許可される" do
      create(:round, round_number: 1)
      round = build(:round, round_number: 1)
      expect(round).to be_valid
    end
  end
end
