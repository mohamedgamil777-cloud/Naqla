/** Runs once when the server starts: validate the environment, then make sure the bootstrap
 *  super-admin exists so the team can always sign in. Failures are logged loudly but never thrown:
 *  an exception here turns every request into a 500, and lib/env already fails closed where it matters. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { getEnv } = await import("./lib/env");
      getEnv();
      const { runBootstrapAdmin } = await import("./services/bootstrap");
      await runBootstrapAdmin();
    } catch (err) {
      console.error("[startup] environment/bootstrap check failed:", err);
    }
  }
}
