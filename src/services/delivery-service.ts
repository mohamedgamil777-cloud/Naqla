/**
 * Delivery (A→B) estimate service. Distance-based pricing by the chosen SIZE
 * class (category), server-authoritative (client never sends a price). Reuses the
 * pure `computeDeliveryQuote` engine + the shared coupon validation.
 */
import type { PromoInput } from "@/engines/pricing";
import { repo } from "@/data/repo";
import { companyBalance } from "@/services/company-service";
import { computeDeliveryQuote, type Quote } from "@/engines/pricing";
import { fireNotify, deliveryCustomerMessage } from "@/services/notify";
import { cairoDateISO, cairoDateTime } from "@/lib/time";

/**
 * Turn the picked day + time into the order's start, enforcing what the order screen offers:
 * minimum notice, working hours, booking window. Shared by the customer API and staff phone orders.
 */
export async function resolveOrderSchedule(date: string, time: string): Promise<{ ok: true; scheduledAt: Date } | { ok: false; reason: "PAST" | "HOURS" | "TOO_FAR" }> {
  const [hour, minute] = time.split(":").map(Number);
  const scheduledAt = cairoDateTime(date, hour, minute);
  const [branch, business] = await Promise.all([repo.defaultBranch(), repo.getBusiness()]);
  if (scheduledAt.getTime() < Date.now() + business.nowLeadHours * 3600e3 - 60e3) return { ok: false, reason: "PAST" };
  const mins = hour * 60 + minute;
  if (mins < branch.working.open * 60 || mins >= branch.working.close * 60) return { ok: false, reason: "HOURS" };
  const lastDay = cairoDateISO(new Date(Date.now() + business.advanceDays * 864e5));
  if (date > lastDay) return { ok: false, reason: "TOO_FAR" };
  return { ok: true, scheduledAt };
}

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
  /** B2B: price with this company's contract discount (coupons don't stack) */
  companyId?: string | null;
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
  if (!promo && params.companyId) {
    const company = await repo.getCompany(params.companyId);
    if (company?.active && company.discountPct > 0) promo = { code: "سعر الشركة", type: "pct", value: company.discountPct };
    if (company?.active) params = { ...params, promoCode: null }; // contract price replaces coupons
  }
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
  /** B2B: order placed by a company member */
  companyId?: string | null;
  /** taken by staff on the phone — starts confirmed (the agent already spoke to the customer) */
  agentName?: string | null;
}): Promise<{ ok: true; code: string } | { ok: false; reason: string }> {
  const cats = await repo.listCategories();
  const cat = cats.find((c) => c.id === input.categoryId);
  if (!cat || !cat.active) return { ok: false, reason: "size" };

  const company = input.companyId ? await repo.getCompany(input.companyId) : null;
  const est = await estimateDelivery({
    categoryId: input.categoryId,
    km: input.km,
    loaders: input.loaders,
    promoCode: company ? null : input.promoCode,
    companyId: company?.id ?? null,
  });
  if (!est) return { ok: false, reason: "size" };

  // Monthly-billed companies order on account, within their credit limit.
  const billing = company?.active && company.billing === "monthly" ? "account" : "cash";
  if (billing === "account" && company!.creditLimit > 0) {
    const bal = await companyBalance(company!.id);
    if (bal.outstanding + bal.open + est.quote.total > company!.creditLimit) return { ok: false, reason: "CREDIT" };
  }

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
      companyId: company?.id ?? null,
      billing,
      source: input.agentName !== undefined ? "agent" : "customer",
      agentName: input.agentName ?? null,
    },
    est.quote,
    cat.name,
    cat.sizeCode
  );
  if (!company && est.promoApplied && input.promoCode) await repo.redeemPromo(input.promoCode);
  if (input.agentName !== undefined) {
    await repo.updateDeliveryOrderStatus(code, "confirmed");
    fireNotify(input.contactPhone, deliveryCustomerMessage("confirmed", code));
  } else {
    fireNotify(input.contactPhone, deliveryCustomerMessage("created", code));
  }
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
