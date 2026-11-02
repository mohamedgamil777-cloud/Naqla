import { deleteExpenseAction } from "@/actions/admin/finance";
import { listExpenses, totalExpenses } from "@/db/lib/expenses";
import { formatEgp } from "@/lib/money";
import { labelDateArabic } from "@/lib/time";
import { ExpenseForm } from "@/components/admin/ExpenseForm";
import { requirePermission } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  await requirePermission("expense:manage");
  // the total is summed in the database; the log shows the most recent entries
  const [expenses, total] = await Promise.all([listExpenses(), totalExpenses()]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold">النثريات</h1>
        <p className="text-muted">مصاريف التشغيل (بنزين، صيانة، مرتبات، وغيره).</p>
      </div>

      <div className="rounded-card p-4 bg-booked-soft text-booked">
        <div className="text-sm font-bold opacity-90">إجمالي النثريات</div>
        <div className="text-2xl font-extrabold mt-1">{formatEgp(total)}</div>
      </div>

      <ExpenseForm />

      {expenses.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="font-extrabold">السجل</h2>
          {expenses.map((e) => (
            <div
              key={e.id}
              className="bg-panel border border-line rounded-card p-3 flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="font-bold text-sm">
                  {e.category} · {formatEgp(e.amount)}
                </div>
                <div className="text-xs text-muted">
                  {labelDateArabic(e.createdAt)}
                  {e.note ? ` · ${e.note}` : ""}
                </div>
              </div>
              <form action={deleteExpenseAction}>
                <input type="hidden" name="id" value={e.id} />
                <button className="text-booked text-sm font-bold border border-booked-soft rounded-lg px-3 py-1.5 tap">
                  حذف
                </button>
              </form>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted text-center py-4">لسه مفيش نثريات.</p>
      )}
    </div>
  );
}
