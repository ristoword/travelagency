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
  async rewrites() {
    // BACKEND_URL is a runtime env var (not NEXT_PUBLIC_ = not baked at build time).
    // In Railway: set BACKEND_URL = internal backend URL (e.g. http://backend.railway.internal:3000)
    // Locally: set BACKEND_URL = http://localhost:3000
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    return [
      {
        source: '/proxy/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
