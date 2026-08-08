Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # トップページは廃止し、メンバー入力画面へ直行させる（#216）
  # トップの扱いは今後変わる可能性があるため、ブラウザに永続キャッシュされる 301 ではなく 302 を使う
  root to: redirect("/games/new", status: 302)

  resources :games, only: [:new, :create, :show] do
    resources :rounds, only: [:new, :create]
  end

  # LIFF 版向け JSON API（OpenAPI 仕様書 docs/openapi.yaml に準拠）
  namespace :api do
    namespace :v1 do
      resources :games, only: [:index, :show, :create] do
        resources :rounds, only: [:create]
      end
    end
  end
end
