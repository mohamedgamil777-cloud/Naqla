/** Runs once when the server starts: validate the environment. Failures are logged loudly but never
 *  thrown: an exception here turns every request into a 500, and lib/env already fails closed where
 *  it matters. No database work here — a connection opened at instance start can be frozen with the
 *  instance and hang later requests; the bootstrap admin runs at staff login instead (admin-login/actions). */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { getEnv } = await import("./lib/env");
      getEnv();
    } catch (err) {
      console.error("[startup] environment check failed:", err);
    }
  }
}
