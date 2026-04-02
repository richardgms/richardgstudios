import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "**.blob.vercel-storage.com",
                pathname: "/**",
            },
        ],
    },
    serverExternalPackages: ["@libsql/client"],
    experimental: {
        serverActions: {
            bodySizeLimit: "50mb",
        },
    },
};

export default nextConfig;
