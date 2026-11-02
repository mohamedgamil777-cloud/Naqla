"use server";
/** حسابي — the customer's identity documents. Owner = the signed-in phone, never a client value. */
import { revalidatePath } from "next/cache";
import { getSession } from "@/services/session";
import { deleteDocument, saveDocument } from "@/db/lib/documents";
import { actionFailure, fail, invalid, ok, throwActionFailure, type ActionResult } from "@/lib/action-result";
import { formObject } from "@/lib/validation/fields";
import { documentInputSchema, documentRefSchema } from "@/lib/validation/account";

export async function saveCustomerDocument(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return fail("محتاج تسجّل دخول الأول.");
  const parsed = documentInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  try {
    await saveDocument({ phone: session.phone, ...parsed.data });
  } catch (error) {
    return actionFailure("saveCustomerDocument", error);
  }
  revalidatePath("/account");
  return ok();
}

export async function deleteCustomerDocument(fd: FormData): Promise<void> {
  const session = await getSession();
  if (!session) return;
  const parsed = documentRefSchema.safeParse(formObject(fd));
  if (!parsed.success) return;
  try {
    // only your own documents (the phone is part of the delete)
    await deleteDocument(parsed.data.id, session.phone);
  } catch (error) {
    throwActionFailure("deleteCustomerDocument", error);
  }
  revalidatePath("/account");
}
