/**
 * Zod building blocks for FormData. Every value from a form arrives as a string (or is missing),
 * so each field trims, converts and validates in one place, and carries the Arabic message the
 * form shows when it fails.
 */
import { z } from "zod";
import { egpToPiastres } from "@/lib/money";
import { isValidEgyptianMobile, toE164 } from "@/lib/phone";

const raw = z.preprocess((v) => (v == null ? "" : String(v).trim()), z.string());

/** Plain object from FormData (the first value of each key). */
export function formObject(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of fd.entries()) {
    if (!(key in out) && typeof value === "string") out[key] = value;
  }
  return out;
}

export const requiredText = (message: string, max = 500) =>
  raw.pipe(z.string().min(1, message).max(max, message));

/** Empty → null. */
export const optionalText = (max = 2000) => raw.transform((v) => v.slice(0, max) || null);

/** A row id the user picked. z.guid(), not z.uuid(): the live database has older hand-made ids
 *  (11111111-1111-…, 22222222-0000-…) that strict RFC uuid checks reject. */
export const id = (message: string) => raw.pipe(z.guid(message));
export const optionalId = () => raw.pipe(z.union([z.literal("").transform(() => null), z.guid()]));

/** Checkbox: present ("on") = true. */
export const checkbox = () => z.preprocess((v) => v === "on" || v === "true" || v === "1", z.boolean());

/** A number typed by the user; empty → null. */
export const optionalNumber = (message: string, opts: { min?: number; max?: number; int?: boolean } = {}) =>
  raw.transform((v, ctx) => {
    if (v === "") return null;
    const n = Number(v);
    const bad =
      !Number.isFinite(n) ||
      (opts.min != null && n < opts.min) ||
      (opts.max != null && n > opts.max) ||
      (opts.int && !Number.isInteger(n));
    if (bad) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message });
      return z.NEVER;
    }
    return n;
  });

export const requiredNumber = (message: string, opts: { min?: number; max?: number; int?: boolean } = {}) =>
  optionalNumber(message, opts).pipe(z.number({ message }));

/** An amount typed in EGP → integer piastres. Empty → 0. */
export const egpAmount = (message: string) =>
  optionalNumber(message, { min: 0 }).transform((v) => (v == null ? 0 : egpToPiastres(v)));

/** An amount in EGP that must be more than zero → piastres. */
export const positiveEgpAmount = (message: string) => egpAmount(message).refine((v) => v > 0, message);

/** An Egyptian mobile (01xxxxxxxxx in any common format) → E.164. */
export const egyptianMobile = (message: string) =>
  raw.transform((v, ctx) => {
    if (!isValidEgyptianMobile(v)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message });
      return z.NEVER;
    }
    return toE164(v);
  });

/** One of a fixed set of values (enum columns reuse their drizzle-zod options). */
export const choice = <T extends string>(values: readonly [T, ...T[]], message: string) =>
  raw.pipe(z.enum(values as [T, ...T[]], { errorMap: () => ({ message }) }));

export const isoDate = (message: string) => raw.pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, message));
export const optionalIsoDate = (message: string) =>
  raw.pipe(z.union([z.literal("").transform(() => null), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, message)]));

/** `{ id }` of the row a button acts on. */
export const rowRefSchema = z.object({ id: id("مش موجود.") });
