import { afterEach, describe, expect, it, vi } from "vitest";
import { adminPasscode, authSecret, getEnv, resetEnvCache } from "@/lib/env";

const STRONG = "x".repeat(48);
const DB = "postgresql://u:p@db.example.com:6543/postgres";

function withEnv(vars: Record<string, string | undefined>) {
  vi.unstubAllEnvs();
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v as string);
  resetEnvCache();
}

afterEach(() => {
  vi.unstubAllEnvs();
  resetEnvCache();
});

describe("production fails closed", () => {
  it("refuses to start without DATABASE_URL in any environment (Postgres is the only store)", () => {
    for (const NODE_ENV of ["production", "development", "test"]) {
      withEnv({ NODE_ENV, DATABASE_URL: "", AUTH_SECRET: STRONG });
      expect(() => getEnv()).toThrow(/DATABASE_URL is required/);
    }
  });

  it("refuses sign-in with a missing, short or default AUTH_SECRET, without taking the site down", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const secret of ["", "short", "dev-only-insecure-secret-change-me-please-32b"]) {
      withEnv({ NODE_ENV: "production", DATABASE_URL: DB, AUTH_SECRET: secret });
      expect(() => getEnv()).not.toThrow();
      expect(() => authSecret()).toThrow(/AUTH_SECRET/);
    }
    err.mockRestore();
  });

  it("accepts postgres connection strings a strict URL parser would reject", () => {
    withEnv({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://u:p#ss@word@db.example.com:6543/postgres",
      AUTH_SECRET: STRONG,
    });
    expect(getEnv().DATABASE_URL).toMatch(/^postgresql:/);
    withEnv({ NODE_ENV: "production", DATABASE_URL: "mysql://u:p@h/db", AUTH_SECRET: STRONG });
    expect(() => getEnv()).toThrow(/DATABASE_URL/);
  });

  it("rejects an unknown SMS provider instead of falling back to console", () => {
    withEnv({ NODE_ENV: "production", DATABASE_URL: DB, AUTH_SECRET: STRONG, SMS_PROVIDER: "nope" });
    expect(() => getEnv()).toThrow(/SMS_PROVIDER/);
  });

  it("starts with a database and a strong secret; console SMS is allowed (no provider yet)", () => {
    withEnv({ NODE_ENV: "production", DATABASE_URL: DB, AUTH_SECRET: STRONG });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(getEnv().SMS_PROVIDER).toBe("console");
    expect(authSecret()).toBe(STRONG);
    warn.mockRestore();
  });

  it("does not block `next build` (secrets are enforced at runtime)", () => {
    withEnv({
      NODE_ENV: "production",
      NEXT_PHASE: "phase-production-build",
      DATABASE_URL: "",
      AUTH_SECRET: "",
    });
    expect(() => getEnv()).not.toThrow();
  });
});

describe("admin passcode", () => {
  it("is refused in production when missing, short or the public default", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const pass of ["", "1234", "naqla2026"]) {
      withEnv({ NODE_ENV: "production", DATABASE_URL: DB, AUTH_SECRET: STRONG, ADMIN_PASSCODE: pass });
      expect(adminPasscode()).toBeNull();
    }
    withEnv({
      NODE_ENV: "production",
      DATABASE_URL: DB,
      AUTH_SECRET: STRONG,
      ADMIN_PASSCODE: "a-strong-team-pass",
    });
    expect(adminPasscode()).toBe("a-strong-team-pass");
    err.mockRestore();
  });

  it("keeps the dev default outside production", () => {
    withEnv({ NODE_ENV: "development", DATABASE_URL: DB, ADMIN_PASSCODE: "" });
    expect(adminPasscode()).toBe("naqla2026");
  });
});
