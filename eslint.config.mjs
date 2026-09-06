import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/generated/**",
      "docs/legacy/**",
      "packages/db/prisma/migrations/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // QA scripts are plain Node ESM driving a browser, so they legitimately
    // use Node globals and (inside page.evaluate) DOM globals.
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        document: "readonly",
        window: "readonly",
      },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "no-console": "off",
    },
  },
  {
    // Database-backed tests import their modules lazily, after the test env
    // has pointed DATABASE_URL at the test database, so they need import()
    // types to describe the resulting bindings.
    files: ["**/__tests__/**/*.ts"],
    rules: { "@typescript-eslint/consistent-type-imports": "off" },
  },
  prettier,
);
