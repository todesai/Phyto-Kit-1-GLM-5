import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow cross-origin requests from preview panel
  allowedDevOrigins: [
    'preview-chat-bea39eae-0ccb-4221-b8ff-316b3ac2bca1.space.z.ai',
    '.space.z.ai',
    '.z.ai'
  ],
};

export default nextConfig;
