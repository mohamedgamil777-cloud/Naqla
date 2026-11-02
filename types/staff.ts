import type { z } from "zod";
import type { selectDocumentSchema, selectUserSchema } from "@/db/schema";
import type { staffInputSchema } from "@/lib/validation/staff";

type UserRow = z.infer<typeof selectUserSchema>;
type DocumentRow = z.infer<typeof selectDocumentSchema>;

export type StaffRole = Exclude<UserRow["role"], "customer">;

export type StaffDTO = Pick<
  UserRow,
  "id" | "phone" | "nationalId" | "photo" | "drivingLicense" | "vehicleLicense" | "available"
> & {
  name: string;
  role: StaffRole;
  /** can sign in (password set by an admin) */
  hasPassword?: boolean;
};

type StaffForm = z.infer<typeof staffInputSchema>;
export type StaffInput = Pick<StaffForm, "name" | "phone" | "role"> &
  Partial<Pick<StaffForm, "nationalId" | "photo" | "drivingLicense" | "vehicleLicense">>;

/** Everything the password login needs about one account (customers, drivers and staff share `users`). */
export type LoginAccount = Pick<
  UserRow,
  "id" | "phone" | "name" | "role" | "passwordHash" | "failedLoginCount" | "lockedUntil" | "phoneVerifiedAt"
>;

/** A customer as agents see it in admin → العملاء. */
export type CustomerAccountDTO = Pick<UserRow, "id" | "phone" | "name" | "phoneVerifiedAt" | "createdAt"> & {
  hasPassword: boolean;
};

export type DocumentType = DocumentRow["type"];
export type DocumentDTO = Pick<DocumentRow, "id" | "phone" | "type" | "url" | "expiry" | "createdAt">;
export type DocumentInput = Pick<DocumentRow, "phone" | "type" | "url"> & { expiry?: string | null };
