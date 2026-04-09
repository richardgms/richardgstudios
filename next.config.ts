import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "**.blob.vercel-storage.com",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "**.r2.dev",
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
