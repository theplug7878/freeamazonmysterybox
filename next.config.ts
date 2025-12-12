/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbopack: false,  // Key fix: Disable Turbopack, use Webpack
  },
  webpack: (config, { isServer }) => {
    if (isServer) {  // Apply AMD fix only server-side (no client bundling issues)
      config.module.rules.push({
        test: /\.js$/,
        exclude: /node_modules\/(paapi5-nodejs-sdk)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['next/babel'],
            parser: { amd: false },
          },
        },
      });
    }
    return config;
  },
};

module.exports = nextConfig;