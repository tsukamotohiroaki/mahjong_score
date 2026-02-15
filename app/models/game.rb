class Game < ApplicationRecord
  has_many :players
  has_many :rounds

  validates :mochi_ten, numericality: { only_integer: true, greater_than: 0 }
  validates :kaeshi_ten, numericality: { only_integer: true, greater_than: 0 }
  validate :rank_bonuses_must_be_zero_sum

  private

  def rank_bonuses_must_be_zero_sum
    bonus_sum = rank_1_bonus.to_i + rank_2_bonus.to_i + rank_3_bonus.to_i + rank_4_bonus.to_i
    expected = (kaeshi_ten.to_i - mochi_ten.to_i) * 4 / 1000
    if bonus_sum != expected
      errors.add(:base, "順位点の合計が正しくありません（現在: #{bonus_sum}、期待値: #{expected}）")
    end
  end
end
