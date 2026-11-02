/** Branches (the active one is the default). */
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { branches } from "@/db/schema";
import type { BranchDTO } from "@/types";
import { mapBranch } from "./shared";

export async function defaultBranch(): Promise<BranchDTO> {
  const b = await db.query.branches.findFirst({ where: (branches) => eq(branches.active, true) });
  return mapBranch(b);
}

export async function getBranch(id: string): Promise<BranchDTO | null> {
  const b = await db.query.branches.findFirst({ where: (branches) => eq(branches.id, id) });
  return b ? mapBranch(b) : null;
}

export async function listBranches(): Promise<BranchDTO[]> {
  const rows = await db.query.branches.findMany({ where: (branches) => eq(branches.active, true) });
  return rows.map(mapBranch);
}

/** Updates the given branch (default: the active one) in one statement. */
export async function updateBranch(input: Partial<BranchDTO>): Promise<boolean> {
  const target = input.id
    ? eq(branches.id, input.id)
    : eq(branches.id, sql`(select ${branches.id} from ${branches} where ${branches.active} limit 1)`);
  const res = await db
    .update(branches)
    .set({
      ...(input.name != null ? { name: input.name } : {}),
      ...(input.address != null ? { address: input.address } : {}),
      ...(input.lat != null ? { lat: input.lat } : {}),
      ...(input.lng != null ? { lng: input.lng } : {}),
      ...(input.working != null ? { workingHours: input.working } : {}),
    })
    .where(target)
    .returning({ id: branches.id });
  return res.length > 0;
}
