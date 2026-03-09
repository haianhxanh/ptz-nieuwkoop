/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/app",
  serverExternalPackages: ["@react-pdf/renderer"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.nieuwkoop-europe.com",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: process.env.API_URL || "http://localhost:9000/:path*",
      },
    ];
  },
};

export default nextConfig;
