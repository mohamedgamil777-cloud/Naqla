"use server";
import { revalidatePath } from "next/cache";
import { requireAdminRole, getAdminName } from "@/services/admin-auth";
import { createDeliveryOrder, estimateDelivery, resolveOrderSchedule, type DeliveryEstimate } from "@/services/delivery-service";
import { toE164 } from "@/lib/phone";

const ROLES = ["super_admin", "agent"] as const;

export interface PhoneOrderState {
  ok: boolean;
  error?: string;
  code?: string;
}

/** Live price while the agent fills the form (same server pricing as the customer site). */
export async function quotePhoneOrder(input: {
  categoryId: string;
  km: number;
  loaders: number;
  promoCode: string;
  companyId: string;
}): Promise<DeliveryEstimate | null> {
  await requireAdminRole([...ROLES]);
  if (!input.categoryId || !(input.km > 0)) return null;
  return estimateDelivery({
    categoryId: input.categoryId,
    km: input.km,
    loaders: input.loaders,
    promoCode: input.companyId ? null : input.promoCode || null,
    companyId: input.companyId || null,
  });
}

const SCHEDULE_ERROR: Record<string, string> = {
  PAST: "الميعاد لازم يكون بعد مهلة التجهيز من دلوقتي.",
  HOURS: "الميعاد برّه مواعيد العمل.",
  TOO_FAR: "الميعاد أبعد من أقصى أيام الحجز المسبق.",
};

export async function createPhoneOrder(_prev: PhoneOrderState, fd: FormData): Promise<PhoneOrderState> {
  await requireAdminRole([...ROLES]);
  const s = (k: string) => String(fd.get(k) ?? "").trim();

  const contactName = s("contactName");
  if (!contactName) return { ok: false, error: "اكتب اسم العميل." };
  let contactPhone: string;
  try {
    contactPhone = toE164(s("contactPhone"));
  } catch {
    return { ok: false, error: "رقم موبايل العميل مش صحيح." };
  }
  const categoryId = s("categoryId");
  if (!categoryId) return { ok: false, error: "اختار حجم العربية." };
  const km = Number(s("km"));
  if (!Number.isFinite(km) || km <= 0 || km > 1000) return { ok: false, error: "اكتب المسافة بالكيلو." };
  const pickupAddress = s("pickupAddress");
  const dropoffAddress = s("dropoffAddress");
  if (pickupAddress.length < 3 || dropoffAddress.length < 3) return { ok: false, error: "اكتب عنوان الاستلام والتسليم." };
  const date = s("date");
  const time = s("time");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return { ok: false, error: "اختار اليوم والساعة." };

  const when = await resolveOrderSchedule(date, time);
  if (!when.ok) return { ok: false, error: SCHEDULE_ERROR[when.reason] };

  const result = await createDeliveryOrder({
    categoryId,
    km,
    loaders: Math.max(0, Math.floor(Number(s("loaders")) || 0)),
    promoCode: s("promoCode") || null,
    pickupAddress,
    dropoffAddress,
    pickupDetails: s("pickupDetails") || null,
    dropoffDetails: s("dropoffDetails") || null,
    cargoType: s("cargoType") || null,
    notes: s("notes") || null,
    scheduledAt: when.scheduledAt,
    contactName,
    contactPhone,
    companyId: s("companyId") || null,
    agentName: await getAdminName(),
  });
  if (!result.ok) {
    return { ok: false, error: result.reason === "CREDIT" ? "الشركة وصلت للحد الائتماني — لازم تسدّد الأول." : "الحجم ده مش متاح، اختار حجم تاني." };
  }
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true, code: result.code };
}
