/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Disable AMD loader for client-side (fixes ApiClient error)
    if (!isServer) {
      config.module.rules.push({
        test: /\.js$/,
        exclude: /node_modules\/(paapi5-nodejs-sdk)/, // Target only this SDK
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['next/babel'],
            parser: {
              amd: false, // Key fix: Disable AMD parsing
            },
          },
        },
      });
    }
    return config;
  },
};

module.exports = nextConfig;