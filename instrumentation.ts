/** Runs once when the server starts: validate the environment (production fails fast and loudly),
 *  then make sure the bootstrap super-admin exists so the team can always sign in. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getEnv } = await import("./lib/env");
    getEnv();
    const { runBootstrapAdmin } = await import("./services/bootstrap");
    await runBootstrapAdmin();
  }
}
