require "rails_helper"

RSpec.describe RoundScoreForm do
  let(:game) { create(:game) }
  let(:players) { create_list(:player, 4, game: game) }

  def build_form(raw_scores)
    described_class.new(players: players, raw_scores: raw_scores)
  end

  # プレイヤー4人に順番に値を割り当てた raw_scores を作る
  def scores_for(*values)
    players.zip(values).to_h { |player, value| [player.id, value] }
  end

  describe "正常系" do
    it "整数4人分・合計1000なら有効" do
      form = build_form(scores_for("450", "250", "200", "100"))
      expect(form).to be_valid
    end

    it "負の値を含む合計1000も有効" do
      form = build_form(scores_for("500", "400", "200", "-100"))
      expect(form).to be_valid
    end

    it "境界値 +1000 / -1000 ちょうどは有効" do
      form = build_form(scores_for("1000", "1000", "-1000", "0"))
      expect(form).to be_valid
    end
  end

  describe "範囲外" do
    it "+1001 は無効" do
      form = build_form(scores_for("1001", "999", "-1000", "0"))
      expect(form).to be_invalid
      expect(form.errors.full_messages).to eq(["点数は -1000〜1000 の範囲で入力してください"])
    end

    it "-1001 は無効" do
      form = build_form(scores_for("1000", "1000", "-1001", "1"))
      expect(form).to be_invalid
      expect(form.errors.full_messages).to eq(["点数は -1000〜1000 の範囲で入力してください"])
    end
  end

  describe "整数でない入力" do
    ["", "1.5", "abc", "２５０"].each do |invalid_value|
      it "#{invalid_value.inspect} を含むと無効" do
        form = build_form(scores_for("450", "250", "200", invalid_value))
        expect(form).to be_invalid
        expect(form.errors.full_messages).to eq(["点数は全プレイヤー分を整数で入力してください"])
      end
    end
  end

  describe "合計不一致" do
    it "合計999は無効" do
      form = build_form(scores_for("450", "250", "200", "99"))
      expect(form).to be_invalid
      expect(form.errors.full_messages).to eq(["点数の合計が 1000 になりません"])
    end

    it "合計1001は無効" do
      form = build_form(scores_for("450", "250", "200", "101"))
      expect(form).to be_invalid
      expect(form.errors.full_messages).to eq(["点数の合計が 1000 になりません"])
    end
  end

  describe "入力不足" do
    it "3人分しかないと無効（整数エラー扱い）" do
      three_players_only = scores_for("450", "250", "300").reject { |_, v| v.nil? }
      form = build_form(three_players_only)
      expect(form).to be_invalid
      expect(form.errors.full_messages).to eq(["点数は全プレイヤー分を整数で入力してください"])
    end
  end

  describe "検証順序" do
    it "範囲外と合計不一致が同時に起きたら範囲エラーを優先する" do
      form = build_form(scores_for("1001", "0", "0", "0"))
      expect(form).to be_invalid
      expect(form.errors.full_messages).to eq(["点数は -1000〜1000 の範囲で入力してください"])
    end

    it "非整数と範囲外が同時に起きたら整数エラーを優先する" do
      form = build_form(scores_for("abc", "1001", "0", "0"))
      expect(form).to be_invalid
      expect(form.errors.full_messages).to eq(["点数は全プレイヤー分を整数で入力してください"])
    end
  end

  describe "#units_by_player_id" do
    it "player_id => 百点棒単位の整数 を返す" do
      form = build_form(scores_for("450", "250", "200", "100"))
      expect(form.units_by_player_id).to eq(
        players[0].id => 450,
        players[1].id => 250,
        players[2].id => 200,
        players[3].id => 100
      )
    end
  end
end
