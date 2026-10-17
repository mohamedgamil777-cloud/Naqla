/** Driver ratings, from customers' star ratings on completed delivery orders. Pure (safe in client code). */
import type { DeliveryOrderDTO } from "@/data/types";

export interface RatingStat {
  avg: number;
  count: number;
}

export function driverRatings(orders: DeliveryOrderDTO[]): Record<string, RatingStat> {
  const sum: Record<string, { total: number; count: number }> = {};
  for (const o of orders) {
    if (!o.driverId || o.rating == null) continue;
    const s = (sum[o.driverId] ??= { total: 0, count: 0 });
    s.total += o.rating;
    s.count += 1;
  }
  const out: Record<string, RatingStat> = {};
  for (const [id, s] of Object.entries(sum)) out[id] = { avg: s.total / s.count, count: s.count };
  return out;
}

/** "⭐ 4.6 (12)" or "لسه مفيش تقييم". */
export function ratingLabel(s?: RatingStat): string {
  return s && s.count ? `⭐ ${s.avg.toFixed(1)} (${s.count})` : "لسه مفيش تقييم";
}
