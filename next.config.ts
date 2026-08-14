import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse loads pdfjs' worker dynamically at runtime. Keeping it external
  // preserves the package's worker path instead of pointing it at a Turbopack
  // development chunk that does not exist.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
