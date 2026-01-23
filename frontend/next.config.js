/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://mimiq-polymarket-xipueo-b79c50-51-222-111-251.traefik.me/api',
  },
  webpack: (config) => {
    // Fix for @metamask/sdk missing react-native module
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
    };
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
}

module.exports = nextConfig
