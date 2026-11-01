/** Runs once when the server starts. It must never throw: a failure here makes Next.js answer
 *  every request with 500 (the 1 Nov 2026 outage). Problems are logged and the site keeps serving.
 *  Keep the imports inside the `if` block: Next.js uses it to leave them out of the edge bundle. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { reportEnvProblems } = await import("./lib/env");
      reportEnvProblems();
    } catch (e) {
      console.error("[startup] environment check failed:", e);
    }
    try {
      const { runBootstrapAdmin } = await import("./services/bootstrap");
      await runBootstrapAdmin();
    } catch (e) {
      console.error("[startup] bootstrap admin failed:", e);
    }
  }
}
