import type { z } from "zod";
import type {
  selectCompanyMemberSchema,
  selectCompanyPaymentSchema,
  selectCompanySchema,
  selectCompanyRequestSchema,
  selectSavedAddressSchema,
} from "@/db/schema";

type CompanyRow = z.infer<typeof selectCompanySchema>;

export type CompanyBilling = CompanyRow["billing"];
export type CompanyRole = z.infer<typeof selectCompanyMemberSchema>["role"];

/** `discountPct`: contract discount 0–100 · `creditLimit`: max outstanding (piastres), 0 = no limit. */
export type CompanyDTO = CompanyRow;
export type CompanyInput = Omit<CompanyDTO, "id" | "createdAt">;

/** `phone`: E.164 login phone. */
export type CompanyMemberDTO = z.infer<typeof selectCompanyMemberSchema>;

/** `amount`: piastres. */
export type CompanyPaymentDTO = z.infer<typeof selectCompanyPaymentSchema>;

/** owner = "c:<companyId>" (shared by the company) or "p:<phone>" (personal) */
export type SavedAddressDTO = z.infer<typeof selectSavedAddressSchema>;
export type SavedAddressInput = Omit<SavedAddressDTO, "id" | "createdAt" | "isDefault"> & { isDefault?: boolean };
/** an edit of one saved address (the owner never changes) */
export type SavedAddressPatch = Pick<SavedAddressDTO, "label" | "address" | "details" | "lat" | "lng">;

/** «للشركات» application from the website. */
export type CompanyRequestDTO = z.infer<typeof selectCompanyRequestSchema>;
export type CompanyRequestInput = Pick<CompanyRequestDTO, "companyName" | "contactName" | "phone" | "monthlyTrips" | "note">;
