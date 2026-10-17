/**
 * Delivery (A→B) estimate service. Distance-based pricing by the chosen SIZE
 * class (category), server-authoritative (client never sends a price). Reuses the
 * pure `computeDeliveryQuote` engine + the shared coupon validation.
 */
import type { PromoInput } from "@/engines/pricing";
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
  /** use these exact promo terms instead of validating a code (admin re-pricing) */
  promoOverride?: PromoInput | null;
}): Promise<DeliveryEstimate | null> {
  const [cats, business, content] = await Promise.all([repo.listCategories(), repo.getBusiness(), repo.getAppContent()]);
  const cat = cats.find((c) => c.id === params.categoryId);
  if (!cat || !cat.active) return null; // hidden types can't be ordered

  const rates = {
    baseFare: cat.baseFare,
    perKm: cat.perKm,
    loaderFeePerPerson: content.order.loaderFee, // admin → محتوى التطبيق
  };
  const km = Math.max(0, params.km);
  const loaders = Math.min(content.order.maxLoaders, Math.max(0, Math.floor(params.loaders ?? 0)));

  // First pass (no promo) to learn the subtotal for the coupon's min-value check.
  const preview = computeDeliveryQuote({ km, loaders, promo: null }, rates, { vatRate: business.vatRate });

  let promo: PromoInput | null = params.promoOverride ?? null;
  let promoError = false;
  if (!promo && params.promoCode && params.promoCode.trim()) {
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
  pickupDetails?: string | null;
  dropoffDetails?: string | null;
  cargoType?: string | null;
  notes?: string | null;
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
  if (!cat || !cat.active) return { ok: false, reason: "size" };

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
      pickupDetails: input.pickupDetails?.trim() || null,
      dropoffDetails: input.dropoffDetails?.trim() || null,
      cargoType: input.cargoType?.trim() || null,
      notes: input.notes?.trim() || null,
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
  if (est.promoApplied && input.promoCode) await repo.redeemPromo(input.promoCode);
  fireNotify(input.contactPhone, deliveryCustomerMessage("created", code));
  return { ok: true, code };
}

/**
 * Admin switches an order to another truck size. Price is recomputed server-side from the new
 * size's rates (same km + loaders). The customer's coupon is kept: re-validated if still valid,
 * otherwise the same discount amount they already got is applied.
 */
export async function changeDeliveryOrderSize(code: string, categoryId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const order = await repo.getDeliveryOrder(code);
  if (!order) return { ok: false, reason: "NOT_FOUND" };
  if (order.status === "completed" || order.status === "cancelled") return { ok: false, reason: "CLOSED" };
  const cat = (await repo.listCategories()).find((c) => c.id === categoryId);
  if (!cat || !cat.sizeCode || !cat.active) return { ok: false, reason: "SIZE" };
  if (cat.id === order.categoryId) return { ok: true };

  const oldDiscount = order.priceSnapshot.discount;
  const code0 = order.priceSnapshot.lines.find((l) => l.key === "discount")?.labelAr.match(/\((.+)\)/)?.[1] ?? null;
  let est = await estimateDelivery({ categoryId, km: order.km, loaders: order.loaders, promoCode: code0 });
  if (est && oldDiscount > 0 && !est.promoApplied) {
    est = await estimateDelivery({
      categoryId, km: order.km, loaders: order.loaders,
      promoOverride: { code: code0 ?? "خصم", type: "fixed", value: oldDiscount },
    });
  }
  if (!est) return { ok: false, reason: "SIZE" };

  await repo.updateDeliveryOrderSize(code, { categoryId, sizeName: cat.name, sizeCode: cat.sizeCode, quote: est.quote });
  fireNotify(order.contactPhone, `تم تعديل حجم العربية لطلبك 🚚
رقم الطلب: ${code}
العربية: ${cat.name}
السعر الجديد: ${(est.quote.total / 100).toFixed(2)} جنيه`);
  return { ok: true };
}
