/** Guard for scripts that must never touch a shared database (sample data, wipes). */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/** Throws unless DATABASE_URL points at this machine; returns the URL. */
export function requireLocalDatabase(what: string): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const host = new URL(url).hostname;
  if (!LOCAL_HOSTS.has(host)) throw new Error(`Refusing to ${what} on ${host}: local databases only`);
  return url;
}
