import { afterEach, describe, expect, it, vi } from "vitest";
import { adminPasscode, authAvailable, authSecret, envProblems, EnvError, getEnv, resetEnvCache } from "@/lib/env";

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

describe("production: a bad setting never takes the site down", () => {
  it("never throws, whatever the environment", () => {
    for (const vars of [
      { NODE_ENV: "production", DATABASE_URL: "", AUTH_SECRET: "" },
      { NODE_ENV: "production", DATABASE_URL: DB, AUTH_SECRET: "short" },
      { NODE_ENV: "production", DATABASE_URL: DB, AUTH_SECRET: STRONG, SMS_PROVIDER: "nope" },
    ]) {
      withEnv(vars);
      expect(() => getEnv()).not.toThrow();
      expect(() => envProblems()).not.toThrow();
    }
  });

  it("reports a missing DATABASE_URL", () => {
    withEnv({ NODE_ENV: "production", DATABASE_URL: "", AUTH_SECRET: STRONG, ADMIN_PASSCODE: "a-strong-team-pass" });
    expect(envProblems().join()).toMatch(/DATABASE_URL/);
  });

  it("disables sign-in (never signs with a public default) when AUTH_SECRET is missing, short or the default", () => {
    for (const secret of ["", "short", "dev-only-insecure-secret-change-me-please-32b"]) {
      withEnv({ NODE_ENV: "production", DATABASE_URL: DB, AUTH_SECRET: secret });
      expect(authAvailable()).toBe(false);
      expect(() => authSecret()).toThrow(EnvError);
      expect(envProblems().join()).toMatch(/AUTH_SECRET/);
    }
  });

  it("falls back to console for an unknown SMS provider and reports it", () => {
    withEnv({ NODE_ENV: "production", DATABASE_URL: DB, AUTH_SECRET: STRONG, SMS_PROVIDER: "nope" });
    expect(getEnv().SMS_PROVIDER).toBe("console");
    expect(envProblems().join()).toMatch(/SMS_PROVIDER/);
  });

  it("has no problems with a database, a strong secret and a strong passcode", () => {
    withEnv({ NODE_ENV: "production", DATABASE_URL: DB, AUTH_SECRET: STRONG, ADMIN_PASSCODE: "a-strong-team-pass" });
    expect(envProblems()).toEqual([]);
    expect(authAvailable()).toBe(true);
    expect(authSecret()).toBe(STRONG);
  });

  it("does not complain during `next build` (secrets are checked at runtime)", () => {
    withEnv({ NODE_ENV: "production", NEXT_PHASE: "phase-production-build", DATABASE_URL: "", AUTH_SECRET: "" });
    expect(envProblems()).toEqual([]);
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
    withEnv({ NODE_ENV: "production", DATABASE_URL: DB, AUTH_SECRET: STRONG, ADMIN_PASSCODE: "a-strong-team-pass" });
    expect(adminPasscode()).toBe("a-strong-team-pass");
    err.mockRestore();
  });

  it("keeps the dev default outside production", () => {
    withEnv({ NODE_ENV: "development", ADMIN_PASSCODE: "" });
    expect(adminPasscode()).toBe("naqla2026");
  });
});
