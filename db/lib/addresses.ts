/** Saved addresses (owner = "c:<companyId>" or "p:<phone>"). */
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { savedAddresses } from "@/db/schema";
import type { SavedAddressDTO, SavedAddressInput } from "@/types";

export async function listSavedAddresses(owner: string): Promise<SavedAddressDTO[]> {
  return db.query.savedAddresses.findMany({
    where: (savedAddresses) => eq(savedAddresses.owner, owner),
    orderBy: (savedAddresses) => savedAddresses.label,
  });
}

export async function addSavedAddress(input: SavedAddressInput): Promise<{ id: string }> {
  const [r] = await db.insert(savedAddresses).values(input).returning({ id: savedAddresses.id });
  return { id: r.id };
}

export async function deleteSavedAddress(id: string, owner: string): Promise<boolean> {
  const res = await db
    .delete(savedAddresses)
    .where(and(eq(savedAddresses.id, id), eq(savedAddresses.owner, owner)))
    .returning({ id: savedAddresses.id });
  return res.length > 0;
}
