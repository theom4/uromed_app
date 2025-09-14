/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  async rewrites() {
    return [
      {
        source: '/api/webhook-search',
        destination: 'https://n8n.voisero.info/webhook/search-patient-cnp',
      },
    ];
  },
};

module.exports = nextConfig;
