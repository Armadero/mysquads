import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // canvas and napi-rs/canvas need to be excluded from bundling (native modules)
  serverExternalPackages: ['canvas', '@napi-rs/canvas'],
};

export default nextConfig;
