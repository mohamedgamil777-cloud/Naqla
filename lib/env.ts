/**
 * Server environment, read once with Zod.
 *
 * A bad setting must never take the whole site down (that caused the 1 Nov 2026 outage: the server
 * refused to start and every request returned 500). So reading the environment never throws.
 * Problems are collected, logged loudly at startup (instrumentation.ts), and only the feature
 * that needs the setting is refused:
 *  - AUTH_SECRET missing/weak in production → nobody can sign in (no session is signed with a
 *    public default); public pages, prices and booking forms keep working.
 *  - ADMIN_PASSCODE missing/weak in production → passcode login to the admin is refused.
 *  - SMS_PROVIDER unknown → the console adapter is used and the problem is logged.
 *  - DATABASE_URL missing in production → logged as an error; the in-memory store is used, so data
 *    is NOT saved. Fix it in Vercel immediately.
 */
import "server-only";
import { z } from "zod";

const DEV_AUTH_SECRET = "dev-only-insecure-secret-change-me-please-32b";
const DEV_ADMIN_PASSCODE = "naqla2026";
/** SMS adapters registered in services/sms.ts. */
export const SMS_PROVIDERS = ["console"] as const;
export type SmsProviderName = (typeof SMS_PROVIDERS)[number];

const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : undefined));

const schema = z.object({
  NODE_ENV: z.string().optional(),
  DATABASE_URL: optional,
  AUTH_SECRET: optional,
  ADMIN_PASSCODE: optional,
  SMS_PROVIDER: optional,
  // First super-admin, created at startup if missing (services/bootstrap.ts). Never overwrites a password.
  SEED_ADMIN_PHONE: optional,
  SEED_ADMIN_PASSWORD: optional,
  SEED_ADMIN_NAME: optional,
});

export interface ServerEnv {
  NODE_ENV: "development" | "test" | "production";
  DATABASE_URL?: string;
  AUTH_SECRET?: string;
  ADMIN_PASSCODE?: string;
  SMS_PROVIDER: SmsProviderName;
  SEED_ADMIN_PHONE?: string;
  SEED_ADMIN_PASSWORD?: string;
  SEED_ADMIN_NAME?: string;
}

export class EnvError extends Error {}

function weakSecret(s: string | undefined) {
  return !s || s.length < 32 || s === DEV_AUTH_SECRET;
}

const isBuild = () => process.env.NEXT_PHASE === "phase-production-build";

let cached: { env: ServerEnv; problems: string[] } | null = null;

function load() {
  if (cached) return cached;
  // safeParse cannot fail on this schema (every field is optional), but stay defensive.
  const raw = schema.safeParse(process.env).data ?? {};
  const problems: string[] = [];

  const nodeEnv = raw.NODE_ENV === "production" || raw.NODE_ENV === "test" ? raw.NODE_ENV : "development";

  let sms: SmsProviderName = "console";
  if (raw.SMS_PROVIDER) {
    if ((SMS_PROVIDERS as readonly string[]).includes(raw.SMS_PROVIDER)) sms = raw.SMS_PROVIDER as SmsProviderName;
    else problems.push(`SMS_PROVIDER "${raw.SMS_PROVIDER}" is not a registered adapter (${SMS_PROVIDERS.join(", ")}) — using console`);
  }

  if (nodeEnv === "production") {
    if (!raw.DATABASE_URL) problems.push("DATABASE_URL is missing — data is NOT being saved (in-memory store)");
    if (weakSecret(raw.AUTH_SECRET)) problems.push("AUTH_SECRET is missing, shorter than 32 characters or the public default — sign-in is disabled");
    if (!raw.ADMIN_PASSCODE || raw.ADMIN_PASSCODE.length < 8 || raw.ADMIN_PASSCODE === DEV_ADMIN_PASSCODE) {
      problems.push("ADMIN_PASSCODE is missing, shorter than 8 characters or the public default — admin passcode login is disabled");
    }
  }

  const env: ServerEnv = { ...raw, NODE_ENV: nodeEnv, SMS_PROVIDER: sms };
  cached = { env, problems };
  return cached;
}

/** The parsed environment. Never throws. */
export function getEnv(): ServerEnv {
  return load().env;
}

/** Configuration problems to fix (empty when everything is fine). */
export function envProblems(): string[] {
  return isBuild() ? [] : load().problems;
}

/** Logs every configuration problem once. Called at server start. */
export function reportEnvProblems(): void {
  for (const p of envProblems()) console.error(`[env] ${p}`);
}

/** True when sessions can be signed safely. */
export function authAvailable(): boolean {
  const { AUTH_SECRET, NODE_ENV } = getEnv();
  return NODE_ENV !== "production" || isBuild() || !weakSecret(AUTH_SECRET);
}

/**
 * Secret that signs sessions. Dev default only outside production.
 * Throws EnvError in production when it is missing/weak — callers that sign in users turn that into a
 * clear "sign-in unavailable" answer; reading a session treats it as "signed out".
 */
export function authSecret(): string {
  const { AUTH_SECRET } = getEnv();
  if (AUTH_SECRET && !weakSecret(AUTH_SECRET)) return AUTH_SECRET;
  if (!authAvailable()) throw new EnvError("AUTH_SECRET is missing or weak");
  return AUTH_SECRET ?? DEV_AUTH_SECRET;
}

/** Admin passcode, or null when passcode login must be refused (missing/weak in production). */
export function adminPasscode(): string | null {
  const { ADMIN_PASSCODE, NODE_ENV } = getEnv();
  if (NODE_ENV !== "production") return ADMIN_PASSCODE ?? DEV_ADMIN_PASSCODE;
  if (!ADMIN_PASSCODE || ADMIN_PASSCODE.length < 8 || ADMIN_PASSCODE === DEV_ADMIN_PASSCODE) return null;
  return ADMIN_PASSCODE;
}

/** Test helper: forget the cached environment. */
export function resetEnvCache() {
  cached = null;
}
