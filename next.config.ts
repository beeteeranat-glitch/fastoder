import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/order/:path*",
        destination: "/menu",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
