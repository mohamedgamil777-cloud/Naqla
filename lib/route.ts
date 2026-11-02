/**
 * Route handlers: one place that turns an unexpected failure into a logged, safe 500.
 * Expected outcomes (401/403/400/404/409) are still returned by the handler itself.
 */
import "server-only";
import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";

export function withErrorHandling<A extends unknown[]>(
  scope: string,
  handler: (...args: A) => Promise<Response>,
): (...args: A) => Promise<Response> {
  return async (...args: A) => {
    try {
      return await handler(...args);
    } catch (error) {
      unstable_rethrow(error);
      console.error(`[api] ${scope} failed:`, error);
      return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
    }
  };
}
