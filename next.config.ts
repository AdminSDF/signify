
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
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
  experimental: {
    // In Next.js 14+ allowedDevOrigins is stable, but if using an older version or to be safe for future versions:
    // If your Next.js version is older and puts this under experimental, it might be there.
    // For current versions (like 15.x mentioned in your logs for Turbopack, but the warning itself doesn't specify Next.js version for allowedDevOrigins location),
    // it's typically at the top level of the config.
    // However, the warning message itself usually guides to the correct location.
    // Based on recent Next.js versions, it should be top-level.
  },
  // Add the allowed origin from the development server logs
  // The log message implies this configuration is needed for development (`dev` server).
  allowedDevOrigins: ['https://9000-firebase-studio-1750317228730.cluster-6dx7corvpngoivimwvvljgokdw.cloudworkstations.dev'],
};

export default nextConfig;
