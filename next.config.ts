import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/neurotonics",
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: "/neurotonics",
  },
};

export default nextConfig;
