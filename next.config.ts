import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse loads pdfjs' worker dynamically at runtime. Keeping it external
  // preserves the package's worker path instead of pointing it at a Turbopack
  // development chunk that does not exist.
  serverExternalPackages: ["pdf-parse"],
  experimental: {
    // Document uploads allow up to 10 files at 15MB each; the default 10MB
    // proxy buffer silently truncates larger multipart bodies, which
    // corrupts the form boundary and crashes the upload.
    proxyClientMaxBodySize: "170mb",
  },
};

export default nextConfig;
