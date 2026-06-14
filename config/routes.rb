Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Defines the root path route ("/")
  root "home#index"

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
