import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ngrok 経由の実機確認で dev リソース（HMR/クライアントJS）へのアクセスを許可する
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok-free.app"],

  // /api/* を Rails（別ポート）にプロキシする。
  // フロントからは同一オリジンになるため Rails 側の CORS 設定が不要（#157 のコメント参照）
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${
          process.env.API_BASE_URL ?? "http://localhost:3000"
        }/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
