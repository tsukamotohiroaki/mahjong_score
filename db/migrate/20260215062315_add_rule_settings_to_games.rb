class AddRuleSettingsToGames < ActiveRecord::Migration[7.1]
  def change
    add_column :games, :mochi_ten, :integer, default: 25000, null: false
    add_column :games, :kaeshi_ten, :integer, default: 30000, null: false
    add_column :games, :rank_1_bonus, :integer, default: 50, null: false
    add_column :games, :rank_2_bonus, :integer, default: 10, null: false
    add_column :games, :rank_3_bonus, :integer, default: -10, null: false
    add_column :games, :rank_4_bonus, :integer, default: -30, null: false
  end
end
