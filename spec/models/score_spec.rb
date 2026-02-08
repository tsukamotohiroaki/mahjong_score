require 'rails_helper'

RSpec.describe Score, type: :model do
  describe "バリデーション" do
    let(:game) { create(:game) }
    let(:round) { create(:round, game: game) }
    let(:player) { create(:player, game: game) }

    it "round, player, point が揃っていれば有効" do
      score = build(:score, round: round, player: player)
      expect(score).to be_valid
    end

    it "round がなければ無効" do
      score = build(:score, round: nil, player: player)
      expect(score).to be_invalid
    end

    it "player がなければ無効" do
      score = build(:score, round: round, player: nil)
      expect(score).to be_invalid
    end

    it "point がなければ無効" do
      score = build(:score, round: round, player: player, point: nil)
      expect(score).to be_invalid
    end

    it "同一 round 内で player が重複すれば無効" do
      create(:score, round: round, player: player)
      duplicate = build(:score, round: round, player: player)
      expect(duplicate).to be_invalid
    end
  end
end
