"use server";
/**
 * Admin → محتوى التطبيق. Edits the customer/driver-facing content document.
 * Every action re-checks the role: server actions are callable endpoints.
 */
import { revalidatePath } from "next/cache";
import { repo } from "@/data/repo";
import { requireAdminRole } from "@/services/admin-auth";
import type { AppContent, CargoIcon, FaqTopic } from "@/data/content";

export interface ContentState {
  ok: boolean;
  error?: string;
}

const TOPICS: FaqTopic[] = ["order", "price", "driver", "payment", "cancel"];
const ICONS: CargoIcon[] = ["file", "box", "sofa", "home", "truck"];
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

async function update(mutate: (c: AppContent) => string | void): Promise<ContentState> {
  await requireAdminRole(["super_admin"]);
  const content = await repo.getAppContent();
  const error = mutate(content);
  if (error) return { ok: false, error };
  await repo.saveAppContent(content);
  revalidatePath("/", "layout"); // customer + driver pages read this content
  return { ok: true };
}

export async function saveContactAction(_p: ContentState, fd: FormData): Promise<ContentState> {
  return update((c) => {
    const phone = str(fd, "supportPhone");
    const wa = str(fd, "whatsapp");
    if (phone.replace(/\D/g, "").length < 3) return "اكتب رقم خدمة العملاء (خط ساخن أو موبايل).";
    if (wa.replace(/\D/g, "").length < 10) return "اكتب رقم واتساب صحيح (موبايل 11 رقم).";
    c.supportPhone = phone;
    c.whatsapp = wa;
  });
}

export async function saveHomeAction(_p: ContentState, fd: FormData): Promise<ContentState> {
  return update((c) => {
    const title = str(fd, "title");
    if (!title) return "العنوان مطلوب.";
    c.home.title = title;
    c.home.subtitle = String(fd.get("subtitle") ?? "").trim();
    c.home.heroImage = str(fd, "heroImage") || null;
    c.home.trust = [0, 1, 2].map((i) => str(fd, `trust${i}`) || c.home.trust[i]) as AppContent["home"]["trust"];
    c.home.steps = [0, 1, 2, 3].map((i) => str(fd, `step${i}`) || c.home.steps[i]) as AppContent["home"]["steps"];
  });
}

export async function saveOrderContentAction(_p: ContentState, fd: FormData): Promise<ContentState> {
  return update((c) => {
    const fee = Number(str(fd, "loaderFee"));
    const max = Number(str(fd, "maxLoaders"));
    if (!Number.isFinite(fee) || fee < 0) return "أجر العامل لازم يكون رقم.";
    if (!Number.isInteger(max) || max < 0 || max > 10) return "أقصى عدد عمالة من 0 لـ 10.";
    const cargo: AppContent["order"]["cargo"] = [];
    for (let i = 0; i < 6; i++) {
      const label = str(fd, `cargoLabel${i}`);
      if (!label) continue;
      const icon = str(fd, `cargoIcon${i}`) as CargoIcon;
      cargo.push({ label, size: str(fd, `cargoSize${i}`), icon: ICONS.includes(icon) ? icon : "box" });
    }
    if (cargo.length === 0) return "لازم اختيار واحد على الأقل في «ماذا ستنقل؟».";
    c.order.loaderFee = Math.round(fee * 100);
    c.order.maxLoaders = max;
    c.order.disclaimer = str(fd, "disclaimer");
    c.order.cargo = cargo;
  });
}

export async function saveFaqAction(_p: ContentState, fd: FormData): Promise<ContentState> {
  return update((c) => {
    const q = str(fd, "q");
    const a = String(fd.get("a") ?? "").trim();
    const topic = str(fd, "topic") as FaqTopic;
    if (!q || !a) return "السؤال والإجابة مطلوبين.";
    if (!TOPICS.includes(topic)) return "اختار موضوع.";
    const id = str(fd, "id");
    const existing = id ? c.faqs.find((f) => f.id === id) : null;
    if (existing) Object.assign(existing, { q, a, topic });
    else c.faqs.push({ id: `f${Date.now().toString(36)}`, q, a, topic });
  });
}

export async function deleteFaqAction(fd: FormData): Promise<void> {
  await update((c) => {
    c.faqs = c.faqs.filter((f) => f.id !== str(fd, "id"));
  });
}

export async function moveFaqAction(fd: FormData): Promise<void> {
  await update((c) => {
    const i = c.faqs.findIndex((f) => f.id === str(fd, "id"));
    const j = str(fd, "dir") === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= c.faqs.length) return;
    [c.faqs[i], c.faqs[j]] = [c.faqs[j], c.faqs[i]];
  });
}
