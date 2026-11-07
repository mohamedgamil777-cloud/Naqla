/** Settings documents: business rules and the admin-editable app content. */
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { settings } from "@/db/schema";
import { withDefaults, type AppContent } from "@/lib/content";
import { DEFAULTS } from "@/lib/constants";
import { z } from "zod";
import type { BusinessSettings } from "@/types";
import { CACHE_TAGS, cachedRead, invalidate } from "./cache";

/** The stored "business" document: any field may be missing (defaults fill it) or malformed (ignored). */
const storedBusinessSchema = z
  .object({
    bufferMinutes: z.number(),
    minHours: z.number(),
    maxHours: z.number(),
    advanceDays: z.number(),
    nowLeadHours: z.number(),
    freeCancelHours: z.number(),
    vatRate: z.number(),
    currency: z.string(),
    timezone: z.string(),
    durationOptions: z.array(z.number()),
  })
  .partial()
  .catch({});

export const getBusiness = cachedRead("business", CACHE_TAGS.settings, readBusiness);

async function readBusiness(): Promise<BusinessSettings> {
  const row = await db.query.settings.findFirst({ where: (settings) => eq(settings.key, "business") });
  const v = storedBusinessSchema.parse(row?.value ?? {});
  return {
    bufferMinutes: v.bufferMinutes ?? DEFAULTS.bufferMinutes,
    minHours: v.minHours ?? DEFAULTS.minHours,
    maxHours: v.maxHours ?? DEFAULTS.maxHours,
    advanceDays: v.advanceDays ?? DEFAULTS.advanceDays,
    nowLeadHours: v.nowLeadHours ?? DEFAULTS.nowLeadHours,
    freeCancelHours: v.freeCancelHours ?? DEFAULTS.freeCancelHours,
    vatRate: v.vatRate ?? DEFAULTS.vatRate,
    currency: v.currency ?? DEFAULTS.currency,
    timezone: v.timezone ?? DEFAULTS.timezone,
    durationOptions: v.durationOptions ?? [...DEFAULTS.durationOptions],
  };
}

/** Merges the given fields into the stored document in one statement (missing fields keep their defaults). */
export async function updateBusiness(input: Partial<BusinessSettings>): Promise<boolean> {
  await db
    .insert(settings)
    .values({ key: "business", value: input })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: sql`${settings.value} || excluded.value`, updatedAt: new Date() },
    });
  invalidate(CACHE_TAGS.settings);
  return true;
}

export const getAppContent = cachedRead("app_content", CACHE_TAGS.settings, readAppContent);

async function readAppContent(): Promise<AppContent> {
  const row = await db.query.settings.findFirst({ where: (settings) => eq(settings.key, "app_content") });
  return withDefaults((row?.value as Partial<AppContent> | undefined) ?? null);
}

/**
 * Edit the content document: read it under a row lock, apply `mutate`, write it back — so two
 * admins saving different sections never overwrite each other. `mutate` returns an error message
 * to abort without saving.
 */
export async function updateAppContent(
  mutate: (content: AppContent) => string | void,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await db.transaction(async (tx): Promise<{ ok: true } | { ok: false; error: string }> => {
    await tx
      .insert(settings)
      .values({ key: "app_content", value: {} })
      .onConflictDoNothing({ target: settings.key });
    const [row] = await tx.select().from(settings).where(eq(settings.key, "app_content")).for("update");
    const content = withDefaults((row?.value as Partial<AppContent> | undefined) ?? null);
    const error = mutate(content);
    if (error) return { ok: false, error };
    await tx
      .update(settings)
      .set({ value: content, updatedAt: new Date() })
      .where(eq(settings.key, "app_content"));
    return { ok: true };
  });
  if (res.ok) invalidate(CACHE_TAGS.settings);
  return res;
}
