/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['images.unsplash.com', 'via.placeholder.com'],
    formats: ['image/webp'],
    minimumCacheTTL: 2592000,   // 30 days — avoids re-processing images
  },
};

module.exports = nextConfig;
