require 'rails_helper'

RSpec.describe "Games", type: :request do
  describe "POST /games" do
    it "redirects to root path" do
      post games_path, params: { players: ["Player1", "Player2", "Player3", "Player4"] }
      expect(response).to redirect_to(root_path)
    end
  end
end
