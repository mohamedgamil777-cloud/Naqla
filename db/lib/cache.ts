/**
 * Shared cache for small, rarely-changing reads (settings documents, vehicle types) that nearly every
 * page and the mobile app's bootstrap need. Without it each page view pays a database round trip —
 * and on a fresh server instance a whole new connection — just to re-read the same rows; the app
 * content document alone is ~360 KB because the home photos are stored inside it.
 *
 * Entries live in Next's data cache (shared by all server instances on Vercel, survives cold starts)
 * and are dropped the moment an admin saves (`invalidate`), with a time limit as a safety net for
 * writes made outside the app (seeds, SQL). Outside the Next server (tests, scripts) reads go straight
 * to the database.
 */
import { revalidateTag, unstable_cache } from "next/cache";

export const CACHE_TAGS = { settings: "settings", categories: "categories" } as const;

const inNextServer = () => !!process.env.NEXT_RUNTIME;

/** Wraps a no-argument read in the shared cache under `tag`. */
export function cachedRead<T>(key: string, tag: string, read: () => Promise<T>, revalidateSeconds = 300) {
  const cached = unstable_cache(read, [key], { tags: [tag], revalidate: revalidateSeconds });
  return (): Promise<T> => (inNextServer() ? cached() : read());
}

/** Call after a write so every instance re-reads `tag` on its next request. */
export function invalidate(tag: string): void {
  if (!inNextServer()) return;
  try {
    revalidateTag(tag);
  } catch (err) {
    // Outside a request (e.g. a script run through the Next runtime): the time limit still applies.
    console.warn(`[cache] could not invalidate "${tag}":`, err);
  }
}
