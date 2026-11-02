/**
 * The one result shape every server action returns to its form.
 * `error` is always a user-facing Arabic message — never an internal error text.
 */
import "server-only";
import { unstable_rethrow } from "next/navigation";
import type { ZodError } from "zod";
import { errorMsgs } from "@/lib/errors";

/** `{ ok: false }` with no error is the idle state a form starts in. */
export type ActionResult<T extends object = object> =
  ({ ok: true; error?: undefined } & Partial<T>) | { ok: false; error?: string };

export function ok(): { ok: true };
export function ok<T extends object>(data: T): { ok: true } & T;
export function ok(data: object = {}) {
  return { ok: true, ...data };
}

export function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

/** The first validation message (schemas carry the Arabic text shown to the user). */
export function invalid(error: ZodError): { ok: false; error: string } {
  return fail(error.issues[0]?.message ?? errorMsgs.InvalidInput);
}

/**
 * Log an unexpected failure with its scope. Framework control flow (redirect / notFound) is
 * rethrown untouched so a redirect inside a try block still works.
 */
export function logActionError(scope: string, error: unknown): void {
  unstable_rethrow(error);
  console.error(`[action] ${scope} failed:`, error);
}

/** For actions that return a state: log, then hand the form the safe fallback message. */
export function actionFailure(scope: string, error: unknown, message: string = errorMsgs.SomethingWentWrong) {
  logActionError(scope, error);
  return fail(message);
}

/** For plain form actions (no state to return): log, then throw a safe error to the error boundary. */
export function throwActionFailure(scope: string, error: unknown): never {
  logActionError(scope, error);
  throw new Error(errorMsgs.SomethingWentWrong);
}
