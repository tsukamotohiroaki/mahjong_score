require 'rails_helper'

RSpec.describe "Home", type: :request do
  describe "GET /" do
    it "メンバー入力画面にリダイレクトする" do
      get root_path
      expect(response).to redirect_to("/games/new")
    end

    it "302（一時リダイレクト）を返す" do
      # トップページの扱いは今後変わる可能性があるため、ブラウザに永続キャッシュされる 301 は使わない
      get root_path
      expect(response).to have_http_status(302)
    end
  end
end
