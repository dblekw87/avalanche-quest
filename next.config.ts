import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    'media-socket-michelle-pas.trycloudflare.com',
    'temple-uncertainty-message-sheet.trycloudflare.com',
  ],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
