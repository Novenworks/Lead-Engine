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
  // Browsers request /favicon.ico regardless of the <link rel="icon"> tag.
  // Point it at the app mark instead of adding a third copy of a logo that is
  // not yet final; temporary, so the eventual replacement is not cached away.
  redirects: async () => [{ source: "/favicon.ico", destination: "/icon.svg", permanent: false }],
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
