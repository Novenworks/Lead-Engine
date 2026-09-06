import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
    testTimeout: 20_000,
    hookTimeout: 60_000,
    // DB integration tests share one schema; run files serially.
    fileParallelism: false,
  },
});
