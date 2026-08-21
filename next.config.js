/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@faktur-online/core", "@faktur-online/api-client"],
};

module.exports = nextConfig;
