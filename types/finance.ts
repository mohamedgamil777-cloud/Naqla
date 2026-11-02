import type { z } from "zod";
import type { selectDriverPayoutSchema, selectExpenseSchema } from "@/db/schema";
import type { driverPayoutInputSchema, expenseInputSchema } from "@/lib/validation/finance";

type PayoutRow = z.infer<typeof selectDriverPayoutSchema>;
type ExpenseRow = z.infer<typeof selectExpenseSchema>;

export type PayoutMethod = PayoutRow["method"];

/** `amount`: piastres paid to the driver. */
export type DriverPayoutDTO = Pick<
  PayoutRow,
  "id" | "driverId" | "amount" | "method" | "note" | "createdAt"
> & {
  driverName: string | null;
};
export type DriverPayoutInput = z.infer<typeof driverPayoutInputSchema>;

export type ExpenseDTO = Pick<ExpenseRow, "id" | "amount" | "category" | "note" | "createdAt">;
export type ExpenseInput = z.infer<typeof expenseInputSchema>;
