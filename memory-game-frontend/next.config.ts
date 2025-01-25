import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.dog.ceo'] // Add this line
  }
};

export default nextConfig;
