import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ngrok 経由の実機確認で dev リソース（HMR/クライアントJS）へのアクセスを許可する
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok-free.app"],
};

export default nextConfig;
