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

  describe '.create_with_players!' do
    let(:four_names) { %w[Alice Bob Carol Dave] }

    context 'プレイヤーが4人の場合' do
      it 'Game が1件、Player が4件作成されること' do
        expect {
          Game.create_with_players!({}, four_names)
        }.to change(Game, :count).by(1).and change(Player, :count).by(4)
      end

      it '作成した Game を返し、プレイヤーが入力順に紐づくこと' do
        game = Game.create_with_players!({}, four_names)
        expect(game).to be_a(Game)
        expect(game.players.map(&:name)).to eq(four_names)
      end

      it '指定したルール設定が反映されること' do
        game = Game.create_with_players!({ mochi_ten: 30000, kaeshi_ten: 30000,
                                           rank_1_bonus: 30, rank_2_bonus: 10,
                                           rank_3_bonus: -10, rank_4_bonus: -30 }, four_names)
        expect(game.mochi_ten).to eq 30000
        expect(game.rank_1_bonus).to eq 30
      end
    end

    context 'プレイヤーが3人の場合' do
      it 'ActiveRecord::RecordInvalid が発生し、Game と Player が作成されないこと' do
        expect {
          expect { Game.create_with_players!({}, %w[Alice Bob Carol]) }
            .to raise_error(ActiveRecord::RecordInvalid)
        }.to change(Game, :count).by(0).and change(Player, :count).by(0)
      end
    end

    context 'プレイヤーが5人の場合' do
      it 'ActiveRecord::RecordInvalid が発生し、Game と Player が作成されないこと' do
        expect {
          expect { Game.create_with_players!({}, %w[Alice Bob Carol Dave Eve]) }
            .to raise_error(ActiveRecord::RecordInvalid)
        }.to change(Game, :count).by(0).and change(Player, :count).by(0)
      end
    end

    context 'プレイヤーが0人の場合' do
      it 'ActiveRecord::RecordInvalid が発生し、Game と Player が作成されないこと' do
        expect {
          expect { Game.create_with_players!({}, []) }
            .to raise_error(ActiveRecord::RecordInvalid)
        }.to change(Game, :count).by(0).and change(Player, :count).by(0)
      end
    end

    context 'プレイヤーが配列で渡されなかった場合' do
      it 'nil なら ActiveRecord::RecordInvalid が発生し、Game と Player が作成されないこと' do
        expect {
          expect { Game.create_with_players!({}, nil) }
            .to raise_error(ActiveRecord::RecordInvalid)
        }.to change(Game, :count).by(0).and change(Player, :count).by(0)
      end

      it '文字列なら ActiveRecord::RecordInvalid が発生し、Game と Player が作成されないこと' do
        expect {
          expect { Game.create_with_players!({}, 'Alic') }
            .to raise_error(ActiveRecord::RecordInvalid)
        }.to change(Game, :count).by(0).and change(Player, :count).by(0)
      end
    end

    context 'ルール設定が不正な場合' do
      it 'ActiveRecord::RecordInvalid が発生し、Game と Player が作成されないこと' do
        invalid_rule = { mochi_ten: 25000, kaeshi_ten: 30000,
                         rank_1_bonus: 50, rank_2_bonus: 10,
                         rank_3_bonus: -10, rank_4_bonus: -10 }
        expect {
          expect { Game.create_with_players!(invalid_rule, four_names) }
            .to raise_error(ActiveRecord::RecordInvalid)
        }.to change(Game, :count).by(0).and change(Player, :count).by(0)
      end
    end
  end

  describe '#calculate_ranking_scores' do
    let(:game) { create(:game) }
    let(:players) do
      %w[Alice Bob Carol Dave].map { |name| create(:player, game: game, name: name) }
    end
    let(:round) { create(:round, game: game, round_number: 1) }

    context '全員異なる素点' do
      before do
        [40000, 25000, 20000, 15000].each_with_index do |point, i|
          create(:score, round: round, player: players[i], point: point)
        end
      end

      it '順位点が正しく計算されること' do
        results = game.calculate_ranking_scores(round)
        expect(results[players[0].id]).to eq({ rank: 1, score: 60.0 })   # (40000-30000)/1000 + 50
        expect(results[players[1].id]).to eq({ rank: 2, score: 5.0 })    # (25000-30000)/1000 + 10
        expect(results[players[2].id]).to eq({ rank: 3, score: -20.0 })  # (20000-30000)/1000 + (-10)
        expect(results[players[3].id]).to eq({ rank: 4, score: -45.0 })  # (15000-30000)/1000 + (-30)
      end
    end

    context '1位と2位が同点の場合' do
      before do
        [30000, 30000, 25000, 15000].each_with_index do |point, i|
          create(:score, round: round, player: players[i], point: point)
        end
      end

      it '同点者の順位ボーナスが均等に分配されること' do
        results = game.calculate_ranking_scores(round)
        # 1位と2位のボーナスを均等分配: (50 + 10) / 2 = 30.0
        expect(results[players[0].id]).to eq({ rank: 1, score: 30.0 })   # (30000-30000)/1000 + 30
        expect(results[players[1].id]).to eq({ rank: 1, score: 30.0 })
        expect(results[players[2].id]).to eq({ rank: 3, score: -15.0 })  # (25000-30000)/1000 + (-10)
        expect(results[players[3].id]).to eq({ rank: 4, score: -45.0 })  # (15000-30000)/1000 + (-30)
      end
    end

    context '3位と4位が同点の場合' do
      before do
        [40000, 30000, 15000, 15000].each_with_index do |point, i|
          create(:score, round: round, player: players[i], point: point)
        end
      end

      it '同点者の順位ボーナスが均等に分配されること' do
        results = game.calculate_ranking_scores(round)
        expect(results[players[0].id]).to eq({ rank: 1, score: 60.0 })
        expect(results[players[1].id]).to eq({ rank: 2, score: 10.0 })
        # 3位と4位のボーナスを均等分配: (-10 + -30) / 2 = -20.0
        expect(results[players[2].id]).to eq({ rank: 3, score: -35.0 })  # (15000-30000)/1000 + (-20)
        expect(results[players[3].id]).to eq({ rank: 3, score: -35.0 })
      end
    end
  end
end
