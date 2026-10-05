"use server";
import { revalidatePath } from "next/cache";
import { repo } from "@/data/repo";
import { getSession } from "@/services/session";

export interface RateState {
  ok: boolean;
  error?: string;
}

export async function rateOrderAction(_prev: RateState, fd: FormData): Promise<RateState> {
  const session = await getSession();
  if (!session) return { ok: false, error: "سجّل دخولك الأول" };
  const code = String(fd.get("code") ?? "");
  const rating = Number(fd.get("rating") ?? 0);
  const comment = String(fd.get("comment") ?? "").trim() || null;
  if (!code || !Number.isFinite(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "اختار تقييم من 1 لـ 5" };
  }
  const done = await repo.rateDeliveryOrder(code, session.phone, rating, comment);
  if (!done) return { ok: false, error: "مش قادرين نسجّل التقييم دلوقتي" };
  revalidatePath("/bookings");
  return { ok: true };
}
