"use server";
/**
 * Admin → محتوى التطبيق. Edits the customer/driver-facing content document (one JSON row, edited
 * under a row lock so two admins saving different sections never overwrite each other).
 */
import { revalidatePath } from "next/cache";
import { updateAppContent } from "@/db/lib/settings";
import { requirePermission } from "@/lib/authz";
import { audit } from "@/services/audit";
import type { AppContent } from "@/lib/content";
import { actionFailure, fail, invalid, ok, throwActionFailure, type ActionResult } from "@/lib/action-result";
import { formObject } from "@/lib/validation/fields";
import {
  contactInputSchema,
  faqInputSchema,
  faqMoveSchema,
  faqRefSchema,
  homeFormValues,
  homeInputSchema,
  orderContentFormValues,
  orderContentInputSchema,
} from "@/lib/validation/content";

const CONTENT_SECTION: Record<string, string> = {
  saveContact: "أرقام التواصل",
  saveHome: "الصفحة الرئيسية",
  saveOrderContent: "صفحة الطلب",
  saveFaq: "الأسئلة الشائعة",
  deleteFaq: "مسح سؤال من الأسئلة الشائعة",
  moveFaq: "ترتيب الأسئلة الشائعة",
};

async function update(scope: string, mutate: (content: AppContent) => string | void): Promise<ActionResult> {
  await requirePermission("content:manage");
  try {
    const res = await updateAppContent(mutate);
    if (!res.ok) return fail(res.error);
    await audit({ action: "content.update", entity: "content", label: CONTENT_SECTION[scope] ?? scope });
  } catch (error) {
    return actionFailure(scope, error);
  }
  revalidatePath("/", "layout"); // customer + driver pages read this content
  return ok();
}

export async function saveContactAction(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  await requirePermission("content:manage");
  const parsed = contactInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  return update("saveContact", (c) => {
    c.supportPhone = parsed.data.supportPhone;
    c.whatsapp = parsed.data.whatsapp;
  });
}

export async function saveHomeAction(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  await requirePermission("content:manage");
  const parsed = homeInputSchema.safeParse(homeFormValues(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { title, subtitle, heroImages, trust, steps } = parsed.data;
  return update("saveHome", (c) => {
    c.home.title = title;
    c.home.subtitle = subtitle;
    c.home.heroImages = heroImages;
    // an empty line keeps the current text
    c.home.trust = trust.map((t, i) => t ?? c.home.trust[i]) as AppContent["home"]["trust"];
    c.home.steps = steps.map((t, i) => t ?? c.home.steps[i]) as AppContent["home"]["steps"];
  });
}

export async function saveOrderContentAction(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  await requirePermission("content:manage");
  const parsed = orderContentInputSchema.safeParse(orderContentFormValues(fd));
  if (!parsed.success) return invalid(parsed.error);
  return update("saveOrderContent", (c) => {
    c.order.loaderFee = parsed.data.loaderFee;
    c.order.maxLoaders = parsed.data.maxLoaders;
    c.order.disclaimer = parsed.data.disclaimer;
    c.order.cargo = parsed.data.cargo;
  });
}

export async function saveFaqAction(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  await requirePermission("content:manage");
  const parsed = faqInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, q, a, topic } = parsed.data;
  return update("saveFaq", (c) => {
    const existing = id ? c.faqs.find((f) => f.id === id) : null;
    if (existing) Object.assign(existing, { q, a, topic });
    else c.faqs.push({ id: `f${Date.now().toString(36)}`, q, a, topic });
  });
}

export async function deleteFaqAction(fd: FormData): Promise<void> {
  const parsed = faqRefSchema.safeParse(formObject(fd));
  if (!parsed.success) return;
  const res = await update("deleteFaq", (c) => {
    c.faqs = c.faqs.filter((f) => f.id !== parsed.data.id);
  });
  if (!res.ok) throwActionFailure("deleteFaq", new Error(res.error));
}

export async function moveFaqAction(fd: FormData): Promise<void> {
  const parsed = faqMoveSchema.safeParse(formObject(fd));
  if (!parsed.success) return;
  const res = await update("moveFaq", (c) => {
    const i = c.faqs.findIndex((f) => f.id === parsed.data.id);
    const j = parsed.data.dir === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= c.faqs.length) return;
    [c.faqs[i], c.faqs[j]] = [c.faqs[j], c.faqs[i]];
  });
  if (!res.ok) throwActionFailure("moveFaq", new Error(res.error));
}
