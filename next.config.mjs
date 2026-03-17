/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Compress all responses
  compress: true,

  // Serve static assets with long cache headers
  async headers() {
    return [
      {
        source: '/:all*(webp|png|jpg|jpeg|svg|gif|ico|woff2|woff)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ];
  },

  // Reduce JS bundle — remove unused locales
  i18n: undefined,

  // Faster page transitions
  experimental: {
    optimizeCss: false,
  },
};

export default nextConfig;
