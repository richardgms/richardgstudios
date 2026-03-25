import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    serverExternalPackages: ["@libsql/client"],
    experimental: {
        serverActions: {
            bodySizeLimit: "50mb",
        },
    },
};

export default nextConfig;
