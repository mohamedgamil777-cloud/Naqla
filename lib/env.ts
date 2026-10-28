/**
 * Server environment, validated once with Zod. Production fails closed:
 *  - DATABASE_URL is required (the seeded in-memory store is for local development / tests only)
 *  - AUTH_SECRET must be a strong, non-default secret (it signs every login session)
 *  - SMS_PROVIDER must be a registered adapter ("console" = codes shown on screen, kept on purpose
 *    until a real SMS provider is chosen)
 * A missing/weak ADMIN_PASSCODE does not take the whole site down: passcode login to the admin is
 * refused instead (see adminPasscode()).
 * During `next build` checks are relaxed so CI can build without production secrets; they are
 * enforced when the server starts (instrumentation.ts) and on first use.
 */
import "server-only";
import { z } from "zod";

const DEV_AUTH_SECRET = "dev-only-insecure-secret-change-me-please-32b";
const DEV_ADMIN_PASSCODE = "naqla2026";
/** SMS adapters registered in services/sms.ts. */
export const SMS_PROVIDERS = ["console"] as const;

const optional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: optional.pipe(z.string().url("DATABASE_URL must be a postgres connection URL").optional()),
  AUTH_SECRET: optional,
  ADMIN_PASSCODE: optional,
  SMS_PROVIDER: optional.pipe(z.enum(SMS_PROVIDERS).optional()).transform((v) => v ?? "console"),
});

export type ServerEnv = z.infer<typeof schema>;

export class EnvError extends Error {}

function weakSecret(s: string | undefined) {
  return !s || s.length < 32 || s === DEV_AUTH_SECRET;
}

let cached: ServerEnv | null = null;

export function getEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new EnvError(`Invalid server environment — ${issues}`);
  }
  const env = parsed.data;
  const building = process.env.NEXT_PHASE === "phase-production-build";
  if (env.NODE_ENV === "production" && !building) {
    const problems: string[] = [];
    if (!env.DATABASE_URL) problems.push("DATABASE_URL is required in production");
    if (weakSecret(env.AUTH_SECRET)) problems.push("AUTH_SECRET must be set to a random string of 32+ characters");
    if (problems.length) throw new EnvError(`Refusing to start: ${problems.join("; ")}`);
    if (env.SMS_PROVIDER === "console") {
      // Deliberate for now (no SMS provider yet): login codes are returned to the screen.
      console.warn("[env] SMS_PROVIDER=console in production — OTP codes are shown on screen (demo mode).");
    }
  }
  cached = env;
  return env;
}

/** Secret that signs sessions and OTP hashes. Dev default only outside production. */
export function authSecret(): string {
  const { AUTH_SECRET, NODE_ENV } = getEnv();
  if (AUTH_SECRET && !weakSecret(AUTH_SECRET)) return AUTH_SECRET;
  if (NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
    throw new EnvError("AUTH_SECRET is missing or weak");
  }
  return AUTH_SECRET ?? DEV_AUTH_SECRET;
}

/** Admin passcode, or null when passcode login must be refused (missing/weak in production). */
export function adminPasscode(): string | null {
  const { ADMIN_PASSCODE, NODE_ENV } = getEnv();
  if (NODE_ENV !== "production") return ADMIN_PASSCODE ?? DEV_ADMIN_PASSCODE;
  if (!ADMIN_PASSCODE || ADMIN_PASSCODE.length < 8 || ADMIN_PASSCODE === DEV_ADMIN_PASSCODE) {
    console.error("[env] ADMIN_PASSCODE is missing, shorter than 8 characters or the public default — admin passcode login is disabled.");
    return null;
  }
  return ADMIN_PASSCODE;
}

/** Test helper: forget the cached environment. */
export function resetEnvCache() {
  cached = null;
}
