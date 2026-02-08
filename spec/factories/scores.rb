FactoryBot.define do
  factory :score do
    round
    player
    point { 25000 }
  end
end
