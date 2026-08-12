import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, ".."),
  transpilePackages: ["@q3js/client"],
  redirects: async () => [
    {
      source: "/features/mobile-controls",
      destination: "/play-quake-3-on-your-phone",
      permanent: true,
    },
  ],
};

export default nextConfig;
