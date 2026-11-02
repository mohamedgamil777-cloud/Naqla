"use server";
/** طلباتي — the customer rates a completed delivery order. */
import { rateDeliveryOrder } from "@/db/lib/delivery-orders";
import { getSession } from "@/services/session";
import { errorMsgs } from "@/lib/errors";
import { actionFailure, fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { formObject } from "@/lib/validation/fields";
import { rateOrderInputSchema } from "@/lib/validation/delivery-order";

export async function rateOrderAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return fail(errorMsgs.NotAuthenticated);
  const parsed = rateOrderInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { code, rating, comment } = parsed.data;
  try {
    // only the customer's own, completed order (checked in the update itself)
    const done = await rateDeliveryOrder(code, session.phone, rating, comment);
    if (!done) return fail("مش قادرين نسجّل التقييم دلوقتي");
  } catch (error) {
    return actionFailure("rateOrder", error);
  }
  // No revalidatePath here (any revalidate re-renders the current page, which would drop the
  // rating card before the "thanks" shows). Admin pages are dynamic and read fresh data anyway.
  return ok();
}
