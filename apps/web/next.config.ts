import type { NextConfig } from "next";

const config: NextConfig = {
  // Workspace packages ship TypeScript source rather than a build step.
  transpilePackages: [
    "@leadengine/core",
    "@leadengine/db",
    "@leadengine/providers",
    "@leadengine/integrations",
  ],
  serverExternalPackages: ["@prisma/adapter-pg", "pg"],
  typedRoutes: false,
  poweredByHeader: false,
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
      ],
    },
  ],
};

export default config;
