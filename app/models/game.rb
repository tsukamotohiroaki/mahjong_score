class Game < ApplicationRecord
  has_many :players
  has_many :rounds

  validates :mochi_ten, numericality: { only_integer: true, greater_than: 0 }
  validates :kaeshi_ten, numericality: { only_integer: true, greater_than: 0 }
  validate :rank_bonuses_must_be_zero_sum

  def calculate_ranking_scores(round)
    bonuses = [rank_1_bonus, rank_2_bonus, rank_3_bonus, rank_4_bonus]
    sorted_scores = round.scores.sort_by { |s| -s.point }

    # 位置・順位・素点を記録
    entries = sorted_scores.each_with_index.map do |score, i|
      rank = (i == 0 || score.point != sorted_scores[i - 1].point) ? i + 1 : nil
      { player_id: score.player_id, point: score.point, position: i, rank: rank }
    end
    entries.each_with_index { |e, i| e[:rank] ||= entries[i - 1][:rank] }

    # 同点グループごとにボーナスを均等分配
    results = {}
    entries.group_by { |e| e[:rank] }.each do |rank, group|
      avg_bonus = group.sum { |e| bonuses[e[:position]] }.to_f / group.size
      group.each do |e|
        results[e[:player_id]] = { rank: rank, score: (e[:point] - kaeshi_ten).to_f / 1000 + avg_bonus }
      end
    end

    results
  end

  private

  def rank_bonuses_must_be_zero_sum
    bonus_sum = rank_1_bonus.to_i + rank_2_bonus.to_i + rank_3_bonus.to_i + rank_4_bonus.to_i
    expected = (kaeshi_ten.to_i - mochi_ten.to_i) * 4 / 1000
    if bonus_sum != expected
      errors.add(:base, "順位点の合計が正しくありません（現在: #{bonus_sum}、期待値: #{expected}）")
    end
  end
end
