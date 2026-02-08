FactoryBot.define do
  factory :player do
    sequence(:name) { |n| "プレイヤー#{n}" }
    game
  end
end
