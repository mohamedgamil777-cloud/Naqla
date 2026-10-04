"use server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/services/session";
import { repo } from "@/data/repo";
import type { DocumentType } from "@/data/types";

export interface DocState {
  ok: boolean;
  error?: string;
}

export async function saveCustomerDocument(_prev: DocState, fd: FormData): Promise<DocState> {
  const session = await getSession();
  if (!session) return { ok: false, error: "محتاج تسجّل دخول الأول." };
  const type = String(fd.get("type") ?? "") as DocumentType;
  const url = String(fd.get("url") ?? "");
  const expiry = (String(fd.get("expiry") ?? "").trim() || null) as string | null;
  if (type !== "national_id" && type !== "license") return { ok: false, error: "نوع غير صحيح." };
  if (!url.startsWith("data:") && !url.startsWith("http")) return { ok: false, error: "صوّر المستند الأول." };
  await repo.saveDocument({ phone: session.phone, type, url, expiry });
  revalidatePath("/account");
  return { ok: true };
}

export async function deleteCustomerDocument(fd: FormData): Promise<void> {
  const session = await getSession();
  if (!session) return;
  const id = String(fd.get("id") ?? "");
  if (id) await repo.deleteDocument(id);
  revalidatePath("/account");
}
