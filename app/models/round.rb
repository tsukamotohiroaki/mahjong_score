class Round < ApplicationRecord
  belongs_to :game
  has_many :scores

  validates :round_number, presence: true,
            uniqueness: { scope: :game_id }
end
