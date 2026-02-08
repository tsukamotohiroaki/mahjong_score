class Score < ApplicationRecord
  belongs_to :round
  belongs_to :player

  validates :point, presence: true
  validates :player_id, uniqueness: { scope: :round_id }
end
