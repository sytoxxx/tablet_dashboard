import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow local tablet / headless testing via 127.0.0.1 as well as localhost.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
