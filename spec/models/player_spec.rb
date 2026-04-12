require 'rails_helper'

RSpec.describe Player, type: :model do
  describe "バリデーション" do
    it "name が存在する場合は有効である" do
      player = build(:player, name: "Alice")
      expect(player).to be_valid
    end

    it "name が空の場合は無効である" do
      player = build(:player, name: "")
      expect(player).not_to be_valid
    end

    it "name が nil の場合は無効である" do
      player = build(:player, name: nil)
      expect(player).not_to be_valid
    end
  end

  describe "アソシエーション" do
    it "Game に belongs_to している" do
      player = create(:player)
      expect(player.game).to be_a(Game)
    end

    it "Game がない場合は無効である" do
      player = build(:player, game: nil)
      expect(player).not_to be_valid
    end
  end
end
