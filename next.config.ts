import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for `next build` output that can be deployed to Azure App Service.
  output: 'standalone',
  devIndicators: false,
  images: {
    unoptimized: true
  },
  trailingSlash: true,
  serverExternalPackages: ["pg", "bcryptjs"],
  // Pin the project root (a stray package-lock.json in the home folder confuses detection).
  turbopack: { root: __dirname },
  // data/ holds local runtime state and secrets; never copy it into the build output.
  outputFileTracingExcludes: { "*": ["./data/**/*"] },
};

export default nextConfig;
