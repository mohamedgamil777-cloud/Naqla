import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig(({ mode }) => {
  // .env.test.local holds the local test DATABASE_URL (gitignored); CI can set DATABASE_URL directly.
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  process.env.DATABASE_URL = env.DATABASE_URL;

  return {
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./", import.meta.url)),
        "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
      },
    },
    test: {
      environment: "node",
      include: ["tests/**/*.test.ts"],
      env: { DATABASE_URL: env.DATABASE_URL ?? "" },
      globalSetup: ["./tests/setup/global-setup.ts"],
      // One shared database: run test files one after another.
      fileParallelism: false,
    },
  };
});
