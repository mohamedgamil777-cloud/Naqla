/** User-facing error messages shared by server actions and route handlers. */
export const errorMsgs = {
  NotAuthenticated: "سجّل دخولك الأول.",
  NotAuthorized: "مش مسموح لك تعمل كده.",
  NotFound: "مش موجود.",
  InvalidInput: "البيانات مش صحيحة.",
  SomethingWentWrong: "حصلت مشكلة، حاول تاني.",
} as const;

/** Postgres error code of a failed query (drizzle wraps the driver error in `cause`). */
export function pgErrorCode(error: unknown): string | undefined {
  const e = error as { code?: unknown; cause?: { code?: unknown } } | null;
  const code = e?.code ?? e?.cause?.code;
  return typeof code === "string" ? code : undefined;
}

export const PG_UNIQUE_VIOLATION = "23505";
export const PG_FOREIGN_KEY_VIOLATION = "23503";
