/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@portal/shared', '@portal/ui'],
  async rewrites() {
    const apiOrigin = process.env.INTERNAL_API_URL ?? 'http://localhost:3001';
    return [
      {
        source: '/api/:path*',
        destination: `${apiOrigin}/:path*`,
      },
    ];
  },
};

export default nextConfig;
