# 局の点数入力（4人分一括）の検証を MPA / API 共通で担うフォームオブジェクト。
# 入力は百点棒単位（実点数の 1/100）で受け取る。
class RoundScoreForm
  include ActiveModel::Model

  MIN_UNIT = -1000
  MAX_UNIT = 1000
  REQUIRED_TOTAL = 1000

  # players: 対象ゲームの全プレイヤー
  # raw_scores: { player_id(Integer) => 入力値 } に正規化済みのハッシュ
  def initialize(players:, raw_scores:)
    @players = players
    @raw_scores = raw_scores
  end

  validate :scores_must_satisfy_rules

  # player_id => 百点棒単位の点数（整数）。整数に変換できない値・未入力は nil。
  def units_by_player_id
    @units_by_player_id ||= @players.each_with_object({}) do |player, hash|
      raw = @raw_scores[player.id]
      hash[player.id] = raw.to_s.match?(/\A-?\d+\z/) ? raw.to_i : nil
    end
  end

  private

  def scores_must_satisfy_rules
    units = units_by_player_id.values

    if units.any?(&:nil?)
      errors.add(:base, "点数は全プレイヤー分を整数で入力してください")
    elsif units.any? { |unit| unit < MIN_UNIT || unit > MAX_UNIT }
      errors.add(:base, "点数は #{MIN_UNIT}〜#{MAX_UNIT} の範囲で入力してください")
    elsif units.sum != REQUIRED_TOTAL
      errors.add(:base, "点数の合計が #{REQUIRED_TOTAL} になりません")
    end
  end
end
