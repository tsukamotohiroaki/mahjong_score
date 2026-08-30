require "rails_helper"

RSpec.describe "本番環境の設定" do
  # この不具合（#319）は HTTPS を終端するプロキシの後ろでしか再現しないため、
  # 挙動そのものは自動テストで守れない（テスト環境は CSRF 検証を無効化している）。
  # ここで守るのは「設定が消えていないこと」だけ。
  it "assume_ssl が有効になっている（CloudFront 経由でも CSRF 検証を通すため）" do
    production_config = Rails.root.join("config/environments/production.rb").read

    expect(production_config).to match(/^\s*config\.assume_ssl\s*=\s*true/)
  end
end
