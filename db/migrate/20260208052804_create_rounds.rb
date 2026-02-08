class CreateRounds < ActiveRecord::Migration[7.1]
  def change
    create_table :rounds do |t|
      t.references :game, null: false, foreign_key: true
      t.integer :round_number, null: false

      t.timestamps
    end

    add_index :rounds, [:game_id, :round_number], unique: true
  end
end
