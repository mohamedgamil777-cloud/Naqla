/**
 * Delivery (A→B) estimate service. Distance-based pricing for a point-to-point
 * trip, server-authoritative (client never sends a price). Reuses the pure
 * `computeDeliveryQuote` engine + the shared coupon validation.
 */
import { repo } from "@/data/repo";
import { computeDeliveryQuote, type Quote } from "@/engines/pricing";

export interface DeliveryEstimate {
  quote: Quote;
  promoApplied: boolean;
  promoError: boolean;
}

export async function estimateDelivery(params: {
  vehicleId: string;
  km: number;
  loaders?: number;
  promoCode?: string | null;
}): Promise<DeliveryEstimate> {
  const [rule, business] = await Promise.all([repo.resolveRule(params.vehicleId), repo.getBusiness()]);
  const km = Math.max(0, params.km);
  const loaders = Math.max(0, Math.floor(params.loaders ?? 0));

  // First pass (no promo) to learn the subtotal for the coupon's min-value check.
  const preview = computeDeliveryQuote({ km, loaders, promo: null }, rule, { vatRate: business.vatRate });

  let promo = null;
  let promoError = false;
  if (params.promoCode && params.promoCode.trim()) {
    promo = await repo.validatePromo(params.promoCode.trim(), preview.subtotal);
    if (!promo) promoError = true;
  }

  const quote = computeDeliveryQuote({ km, loaders, promo }, rule, { vatRate: business.vatRate });
  return { quote, promoApplied: !!promo, promoError };
}
