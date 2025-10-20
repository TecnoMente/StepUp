/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Webpack configuration for PDF parsing
  webpack: (config, { isServer }) => {
    config.resolve.alias.canvas = false;

    // Ignore pdf-parse test files during build
    if (isServer) {
      config.externals.push({
        'pdf-parse': 'commonjs pdf-parse'
      });
    }

    return config;
  },
};

export default nextConfig;
