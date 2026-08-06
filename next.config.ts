import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/supabase/:path*',
        destination: 'https://14disun0wg.localto.net/:path*', 
      },
    ];
  },
};

export default nextConfig;
