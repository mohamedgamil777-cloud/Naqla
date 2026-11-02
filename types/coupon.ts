import type { z } from "zod";
import type { selectPromoCodeSchema } from "@/db/schema";
import type { couponInputSchema } from "@/lib/validation/coupon";

type PromoRow = z.infer<typeof selectPromoCodeSchema>;

export type CouponType = PromoRow["type"];

/** `value`: pct 0–100, fixed piastres · `minValue`: min subtotal (piastres) · `maxUses` null = unlimited. */
export type CouponDTO = Pick<
  PromoRow,
  "id" | "code" | "type" | "value" | "minValue" | "maxUses" | "used" | "active"
> & {
  /** ISO date, null = no expiry */
  validTo: string | null;
};

export type CouponInput = Omit<z.infer<typeof couponInputSchema>, "id">;
