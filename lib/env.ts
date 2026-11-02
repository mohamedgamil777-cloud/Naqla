/**
 * Server environment, validated once with Zod. Fails closed:
 *  - DATABASE_URL is required in every environment (Postgres is the only data store — local
 *    development and tests use their own local databases, see db/README.md)
 *  - SMS_PROVIDER must be a registered adapter (OTP login is off for now; it returns later as 2FA)
 * Secrets fail closed only where they are used, so one bad secret never takes the whole site down
 * (that 500'd every page on 2026-11-01):
 *  - a missing/weak AUTH_SECRET refuses sign-in and sessions (authSecret() throws), pages still load
 *  - a missing/weak ADMIN_PASSCODE refuses passcode login to the admin (see adminPasscode()).
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
  // Scheme check only: real connection strings can carry characters a strict URL parser rejects.
  DATABASE_URL: optional.pipe(
    z
      .string()
      .regex(/^postgres(ql)?:\/\//, "DATABASE_URL must be a postgres:// connection string")
      .optional(),
  ),
  AUTH_SECRET: optional,
  ADMIN_PASSCODE: optional,
  SMS_PROVIDER: optional.pipe(z.enum(SMS_PROVIDERS).optional()).transform((v) => v ?? "console"),
  // First super-admin, created at startup if missing (services/bootstrap.ts). Never overwrites a password.
  SEED_ADMIN_PHONE: optional,
  SEED_ADMIN_PASSWORD: optional,
  SEED_ADMIN_NAME: optional,
  // Google Maps in the browser (order map, place search, reverse geocoding, driver trip map). The key is
  // sent to the browser by design — restrict it to the site's domains in Google Cloud Console.
  GOOGLE_MAPS_API_KEY: optional,
  // Map ID for vector maps / advanced markers. Defaults to Google's DEMO_MAP_ID (fine for development).
  GOOGLE_MAPS_MAP_ID: optional,
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
  if (!building && !env.DATABASE_URL) throw new EnvError("Refusing to start: DATABASE_URL is required");
  if (env.NODE_ENV === "production" && !building) {
    if (weakSecret(env.AUTH_SECRET)) {
      console.error(
        "[env] AUTH_SECRET is missing, shorter than 32 characters or the public default — sign-in is disabled.",
      );
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
    console.error(
      "[env] ADMIN_PASSCODE is missing, shorter than 8 characters or the public default — admin passcode login is disabled.",
    );
    return null;
  }
  return ADMIN_PASSCODE;
}

/** Test helper: forget the cached environment. */
export function resetEnvCache() {
  cached = null;
}

/** Browser Google Maps settings, or null when no key is configured (pages then fall back to plain fields). */
export function googleMapsConfig(): { apiKey: string; mapId: string } | null {
  const { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_MAP_ID } = getEnv();
  return GOOGLE_MAPS_API_KEY
    ? { apiKey: GOOGLE_MAPS_API_KEY, mapId: GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID" }
    : null;
}
