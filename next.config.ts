import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['canvas', '@napi-rs/canvas'],
};

export default nextConfig;
