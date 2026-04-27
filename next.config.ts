/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'accounts': false, 
    };
    return config;
  },
};

export default nextConfig;