FactoryBot.define do
  factory :round do
    game
    sequence(:round_number) { |n| n }
  end
end
