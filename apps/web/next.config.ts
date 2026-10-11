import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep `next dev` artifacts separate so a production build cannot replace
  // CSS and manifests used by an already-running development server.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.SUPPLYFLOW_API_ORIGIN || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
