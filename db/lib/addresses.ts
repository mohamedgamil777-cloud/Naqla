/** Saved addresses (owner = "c:<companyId>" or "p:<phone>"). Every write is scoped to the owner. */
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { savedAddresses } from "@/db/schema";
import type { SavedAddressDTO, SavedAddressInput, SavedAddressPatch } from "@/types";

/** The default address first, then by name. */
export async function listSavedAddresses(owner: string): Promise<SavedAddressDTO[]> {
  return db.query.savedAddresses.findMany({
    where: (savedAddresses) => eq(savedAddresses.owner, owner),
    orderBy: (savedAddresses) => [desc(savedAddresses.isDefault), savedAddresses.label],
  });
}

/** Adds an address; the first one of a list becomes its default. */
export async function addSavedAddress(input: SavedAddressInput): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: savedAddresses.id })
      .from(savedAddresses)
      .where(eq(savedAddresses.owner, input.owner))
      .limit(1);
    const makeDefault = input.isDefault || existing.length === 0;
    if (makeDefault)
      await tx.update(savedAddresses).set({ isDefault: false }).where(eq(savedAddresses.owner, input.owner));
    const [r] = await tx
      .insert(savedAddresses)
      .values({ ...input, isDefault: makeDefault })
      .returning({ id: savedAddresses.id });
    return { id: r.id };
  });
}

export async function updateSavedAddress(id: string, owner: string, patch: SavedAddressPatch): Promise<boolean> {
  const res = await db
    .update(savedAddresses)
    .set(patch)
    .where(and(eq(savedAddresses.id, id), eq(savedAddresses.owner, owner)))
    .returning({ id: savedAddresses.id });
  return res.length > 0;
}

/** Makes one address the list's default (and clears the old one). */
export async function setDefaultSavedAddress(id: string, owner: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [hit] = await tx
      .select({ id: savedAddresses.id })
      .from(savedAddresses)
      .where(and(eq(savedAddresses.id, id), eq(savedAddresses.owner, owner)));
    if (!hit) return false;
    await tx.update(savedAddresses).set({ isDefault: false }).where(eq(savedAddresses.owner, owner));
    await tx.update(savedAddresses).set({ isDefault: true }).where(eq(savedAddresses.id, id));
    return true;
  });
}

/** Deletes inside the caller's own list; when the default goes, the next address takes its place. */
export async function deleteSavedAddress(id: string, owner: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const res = await tx
      .delete(savedAddresses)
      .where(and(eq(savedAddresses.id, id), eq(savedAddresses.owner, owner)))
      .returning({ id: savedAddresses.id, isDefault: savedAddresses.isDefault });
    if (res.length === 0) return false;
    if (res[0].isDefault) {
      const [next] = await tx
        .select({ id: savedAddresses.id })
        .from(savedAddresses)
        .where(eq(savedAddresses.owner, owner))
        .orderBy(savedAddresses.label)
        .limit(1);
      if (next) await tx.update(savedAddresses).set({ isDefault: true }).where(eq(savedAddresses.id, next.id));
    }
    return true;
  });
}
