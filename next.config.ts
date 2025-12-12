// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This is the official way in Next.js 16 to disable Turbopack
  // (no more experimental.turbopack)
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.module.rules.push({
        test: /\.js$/,
        include: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["next/babel"],
            parser: { amd: false },
          },
        },
      });
    }
    return config;
  },
};

export default nextConfig;