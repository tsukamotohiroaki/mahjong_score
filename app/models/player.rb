class Player < ApplicationRecord
  belongs_to :game
  has_many :scores
  validates :name, presence: true
end
