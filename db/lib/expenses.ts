/** Operating expenses (نثريات). */
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { expenses } from "@/db/schema";
import type { ExpenseDTO, ExpenseInput } from "@/types";

/** Most recent expenses first. */
export async function listExpenses(limit = 200): Promise<ExpenseDTO[]> {
  const rows = await db.query.expenses.findMany({
    orderBy: (expenses) => desc(expenses.createdAt),
    limit: limit,
  });
  return rows.map((e) => ({
    id: e.id,
    amount: e.amount,
    category: e.category,
    note: e.note ?? null,
    createdAt: e.createdAt,
  }));
}

export async function totalExpenses(): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${expenses.amount}), 0)::int` })
    .from(expenses);
  return row.total;
}

export async function addExpense(input: ExpenseInput): Promise<{ id: string }> {
  const [created] = await db
    .insert(expenses)
    .values({
      amount: Math.max(0, Math.round(input.amount)),
      category: input.category,
      note: input.note ?? null,
    })
    .returning({ id: expenses.id });
  return { id: created.id };
}

export async function deleteExpense(id: string): Promise<boolean> {
  await db.delete(expenses).where(eq(expenses.id, id));
  return true;
}
