require 'rails_helper'
require 'net/http'

RSpec.describe 'WebMockによる外部HTTP通信の遮断' do
  it 'スタブしていない外部への実HTTPリクエストは遮断される' do
    expect {
      Net::HTTP.get(URI('http://example.com/'))
    }.to raise_error(WebMock::NetConnectNotAllowedError)
  end

  it 'stub_request で定義したレスポンスがテスト内で返る' do
    stub_request(:get, 'http://example.com/').to_return(status: 200, body: 'stubbed body')

    response = Net::HTTP.get(URI('http://example.com/'))

    expect(response).to eq('stubbed body')
  end
end
