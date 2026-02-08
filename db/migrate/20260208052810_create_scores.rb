class CreateScores < ActiveRecord::Migration[7.1]
  def change
    create_table :scores do |t|
      t.references :round, null: false, foreign_key: true
      t.references :player, null: false, foreign_key: true
      t.integer :point, null: false

      t.timestamps
    end

    add_index :scores, [:round_id, :player_id], unique: true
  end
end
