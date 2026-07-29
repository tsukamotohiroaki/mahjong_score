class Game < ApplicationRecord
  # 順位点計算・ゼロサム検証が4人を前提にしているため、ゲームは4人固定とする
  REQUIRED_PLAYER_COUNT = 4

  has_many :players
  has_many :rounds

  validates :mochi_ten, numericality: { only_integer: true, greater_than: 0 }
  validates :kaeshi_ten, numericality: { only_integer: true, greater_than: 0 }
  validate :rank_bonuses_must_be_zero_sum

  # ゲーム作成とプレイヤー登録をまとめて行う。
  # Game はプレイヤーより先に保存されるため人数を通常のバリデーションで検証できない。
  # プレイヤーがちょうど4人でなければ ActiveRecord::RecordInvalid を投げ、全体をロールバックする。
  def self.create_with_players!(attributes, player_names)
    names = player_names.is_a?(Array) ? player_names : []

    transaction do
      game = new(attributes)
      if names.size != REQUIRED_PLAYER_COUNT
        game.errors.add(:base, "プレイヤーはちょうど#{REQUIRED_PLAYER_COUNT}人で登録してください")
        raise ActiveRecord::RecordInvalid, game
      end

      game.save!
      names.each { |name| game.players.create!(name: name) }
      game
    end
  end

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
