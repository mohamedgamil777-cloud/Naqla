/** Driver rating display (the averages are computed in the database, db/lib/drivers). Pure (safe in client code). */

export interface RatingStat {
  avg: number;
  count: number;
}

/** "⭐ 4.6 (12)" or "لسه مفيش تقييم". */
export function ratingLabel(s?: RatingStat): string {
  return s && s.count ? `⭐ ${s.avg.toFixed(1)} (${s.count})` : "لسه مفيش تقييم";
}
