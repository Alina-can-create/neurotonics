import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/neurotonics",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
