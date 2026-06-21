const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../..'),
  },
  images: {
    domains: ['localhost', 'storage.example.com'],
  },
  // API proxy: apps/frontend-admin/src/app/proxy/api/[...path]/route.ts (runtime BACKEND_URL)
};

module.exports = nextConfig;
