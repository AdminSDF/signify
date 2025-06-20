
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Add the allowed origin from the development server logs to prevent cross-origin errors.
  allowedDevOrigins: ['https://6000-firebase-studio-1750317228730.cluster-6dx7corvpngoivimwvvljgokdw.cloudworkstations.dev'],
};

export default nextConfig;
