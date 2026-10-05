/**
 * Delivery (A→B) estimate service. Distance-based pricing by the chosen SIZE
 * class (category), server-authoritative (client never sends a price). Reuses the
 * pure `computeDeliveryQuote` engine + the shared coupon validation.
 */
import { repo } from "@/data/repo";
import { computeDeliveryQuote, type Quote } from "@/engines/pricing";
import { fireNotify, deliveryCustomerMessage } from "@/services/notify";

export interface DeliveryEstimate {
  quote: Quote;
  promoApplied: boolean;
  promoError: boolean;
}

export async function estimateDelivery(params: {
  categoryId: string;
  km: number;
  loaders?: number;
  promoCode?: string | null;
}): Promise<DeliveryEstimate | null> {
  const [cats, business, globalPricing] = await Promise.all([
    repo.listCategories(),
    repo.getBusiness(),
    repo.defaultPricingInput(),
  ]);
  const cat = cats.find((c) => c.id === params.categoryId);
  if (!cat) return null;

  const rates = {
    baseFare: cat.baseFare,
    perKm: cat.perKm,
    loaderFeePerPerson: globalPricing.loaderFeePerPerson,
  };
  const km = Math.max(0, params.km);
  const loaders = Math.max(0, Math.floor(params.loaders ?? 0));

  // First pass (no promo) to learn the subtotal for the coupon's min-value check.
  const preview = computeDeliveryQuote({ km, loaders, promo: null }, rates, { vatRate: business.vatRate });

  let promo = null;
  let promoError = false;
  if (params.promoCode && params.promoCode.trim()) {
    promo = await repo.validatePromo(params.promoCode.trim(), preview.subtotal);
    if (!promo) promoError = true;
  }

  const quote = computeDeliveryQuote({ km, loaders, promo }, rates, { vatRate: business.vatRate });
  return { quote, promoApplied: !!promo, promoError };
}

/** Persist an A→B delivery order. Re-prices server-side (never trusts the client). */
export async function createDeliveryOrder(input: {
  categoryId: string;
  km: number;
  loaders?: number;
  promoCode?: string | null;
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  scheduledAt: Date;
  contactName: string;
  contactPhone: string;
}): Promise<{ ok: true; code: string } | { ok: false; reason: string }> {
  const cats = await repo.listCategories();
  const cat = cats.find((c) => c.id === input.categoryId);
  if (!cat) return { ok: false, reason: "size" };

  const est = await estimateDelivery({
    categoryId: input.categoryId,
    km: input.km,
    loaders: input.loaders,
    promoCode: input.promoCode,
  });
  if (!est) return { ok: false, reason: "size" };

  const { code } = await repo.createDeliveryOrder(
    {
      categoryId: input.categoryId,
      pickupAddress: input.pickupAddress ?? null,
      dropoffAddress: input.dropoffAddress ?? null,
      pickupLat: input.pickupLat ?? null,
      pickupLng: input.pickupLng ?? null,
      dropoffLat: input.dropoffLat ?? null,
      dropoffLng: input.dropoffLng ?? null,
      km: Math.max(0, input.km),
      loaders: Math.max(0, Math.floor(input.loaders ?? 0)),
      scheduledAt: input.scheduledAt,
      contactName: input.contactName,
      contactPhone: input.contactPhone,
    },
    est.quote,
    cat.name,
    cat.sizeCode
  );
  fireNotify(input.contactPhone, deliveryCustomerMessage("created", code));
  return { ok: true, code };
}
