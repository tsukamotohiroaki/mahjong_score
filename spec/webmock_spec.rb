require "rails_helper"
require "net/http"

RSpec.describe "WebMock による外部通信のスタブ化" do
  it "スタブしていない外部への実 HTTP リクエストは遮断される" do
    expect {
      Net::HTTP.get(URI("https://example.com/"))
    }.to raise_error(WebMock::NetConnectNotAllowedError)
  end

  it "stub_request で定義したレスポンスが返る" do
    stub_request(:get, "https://api.example.com/status")
      .to_return(
        status: 200,
        body: { ok: true }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

    response = Net::HTTP.get(URI("https://api.example.com/status"))

    expect(JSON.parse(response)).to eq("ok" => true)
  end
end
