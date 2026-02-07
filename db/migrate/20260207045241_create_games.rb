class CreateGames < ActiveRecord::Migration[7.1]
  def change
    create_table :games do |t|
      t.string :rule_type

      t.timestamps
    end
  end
end
