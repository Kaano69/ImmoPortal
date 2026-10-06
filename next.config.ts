import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // PDF-Uploads bis 25 MB (siehe MAX_DOCUMENT_SIZE_BYTES in src/lib/storage.ts).
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
