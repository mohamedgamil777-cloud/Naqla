/** «للشركات» applications: saved from the website, followed up from admin → الشركات. */
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db/client";
import { companyRequests } from "@/db/schema";
import type { CompanyRequestDTO, CompanyRequestInput } from "@/types";

export async function addCompanyRequest(input: CompanyRequestInput): Promise<{ id: string }> {
  const [r] = await db.insert(companyRequests).values(input).returning({ id: companyRequests.id });
  return { id: r.id };
}

/** Requests from this phone since `since` (a guard against repeated sends). */
export async function countRecentCompanyRequests(phone: string, since: Date): Promise<number> {
  const rows = await db
    .select({ id: companyRequests.id })
    .from(companyRequests)
    .where(and(eq(companyRequests.phone, phone), gte(companyRequests.createdAt, since)));
  return rows.length;
}

/** Newest first: the open ones, then up to `handledLimit` handled ones. */
export async function listCompanyRequests(handledLimit = 20): Promise<{
  open: CompanyRequestDTO[];
  handled: CompanyRequestDTO[];
}> {
  const [open, handled] = await Promise.all([
    db.select().from(companyRequests).where(eq(companyRequests.status, "new")).orderBy(desc(companyRequests.createdAt)),
    db
      .select()
      .from(companyRequests)
      .where(eq(companyRequests.status, "handled"))
      .orderBy(desc(companyRequests.createdAt))
      .limit(handledLimit),
  ]);
  return { open, handled };
}

export async function setCompanyRequestStatus(id: string, status: CompanyRequestDTO["status"]): Promise<boolean> {
  const res = await db
    .update(companyRequests)
    .set({ status })
    .where(eq(companyRequests.id, id))
    .returning({ id: companyRequests.id });
  return res.length > 0;
}
