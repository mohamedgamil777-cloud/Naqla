import type { Config } from "drizzle-kit";

export default {
  schema: "./db/schema/index.ts",
  // Generated SQL is for REVIEW only: copy reviewed statements into the next numbered
  // file in db/migrations/ (the single tracked history). Never `push` to a real database.
  out: "./db/generated",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
} satisfies Config;
