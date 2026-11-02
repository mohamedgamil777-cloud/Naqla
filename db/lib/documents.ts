/** Customer identity documents (one per type). */
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { documents } from "@/db/schema";
import type { DocumentDTO, DocumentInput } from "@/types";

/** Which document types each phone has uploaded (one query for many customers). */
export async function documentTypesByPhone(phones: string[]): Promise<Map<string, Set<DocumentDTO["type"]>>> {
  const list = [...new Set(phones.filter(Boolean))];
  const out = new Map<string, Set<DocumentDTO["type"]>>();
  if (!list.length) return out;
  const rows = await db
    .selectDistinct({ phone: documents.phone, type: documents.type })
    .from(documents)
    .where(inArray(documents.phone, list));
  for (const r of rows) (out.get(r.phone) ?? out.set(r.phone, new Set()).get(r.phone)!).add(r.type);
  return out;
}

export async function listDocuments(phone: string): Promise<DocumentDTO[]> {
  const rows = await db.query.documents.findMany({
    where: (documents) => eq(documents.phone, phone),
    orderBy: (documents) => desc(documents.createdAt),
  });
  return rows.map((d) => ({
    id: d.id,
    phone: d.phone,
    type: d.type,
    url: d.url,
    expiry: d.expiry,
    createdAt: d.createdAt,
  }));
}

/** One document per type: the old one is replaced in the same transaction. */
export async function saveDocument(input: DocumentInput): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    await tx.delete(documents).where(and(eq(documents.phone, input.phone), eq(documents.type, input.type)));
    const [created] = await tx
      .insert(documents)
      .values({ phone: input.phone, type: input.type, url: input.url, expiry: input.expiry ?? null })
      .returning({ id: documents.id });
    return { id: created.id };
  });
}

/** Deletes the owner's own document only. */
export async function deleteDocument(id: string, phone: string): Promise<boolean> {
  const res = await db
    .delete(documents)
    .where(and(eq(documents.id, id), eq(documents.phone, phone)))
    .returning({ id: documents.id });
  return res.length > 0;
}
