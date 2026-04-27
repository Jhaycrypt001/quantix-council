/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config: any) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'accounts': false, 
    };
    return config;
  },
};

export default nextConfig;