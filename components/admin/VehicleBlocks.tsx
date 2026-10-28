"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { addVehicleBlock, deleteVehicleBlock, type FormState } from "@/app/admin/actions";
import { cairoDateISO } from "@/lib/client-time";

const inp = "rounded-xl border border-line-2 bg-panel px-3 py-2.5 text-base outline-none focus:border-primary";
const lbl = "block text-xs font-bold text-ink-2 mb-1";

export interface BlockRow {
  id: string;
  label: string;
  reason: "maintenance" | "block";
}

export function VehicleBlocks({ vehicleId, blocks }: { vehicleId: string; blocks: BlockRow[] }) {
  const [state, action] = useActionState<FormState, FormData>(addVehicleBlock, { ok: false });

  return (
    <div className="bg-panel border border-line rounded-card p-5 flex flex-col gap-4">
      <div>
        <h2 className="font-extrabold text-lg">أوقات عدم التوفّر</h2>
        <p className="text-sm text-muted">اقفل مواعيد معينة للعربية (صيانة أو حجز خاص) — مش هتظهر للعملاء في المواعيد دي.</p>
      </div>

      {state.error && <div className="bg-booked-soft text-booked rounded-xl px-3 py-2 text-sm font-semibold">{state.error}</div>}
      {state.ok && <div className="bg-ok-soft text-ok rounded-xl px-3 py-2 text-sm font-semibold">تمت الإضافة ✅</div>}

      <form action={action} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="vehicleId" value={vehicleId} />
        <label>
          <span className={lbl}>اليوم</span>
          <input className={inp} type="date" name="date" min={cairoDateISO(0)} required />
        </label>
        <label>
          <span className={lbl}>من الساعة</span>
          <input className={`${inp} w-24`} type="number" name="from" min="0" max="23" defaultValue={8} />
        </label>
        <label>
          <span className={lbl}>للساعة</span>
          <input className={`${inp} w-24`} type="number" name="to" min="1" max="24" defaultValue={22} />
        </label>
        <label>
          <span className={lbl}>السبب</span>
          <select className={inp} name="reason" defaultValue="maintenance">
            <option value="maintenance">صيانة</option>
            <option value="block">حجز خاص</option>
          </select>
        </label>
        <AddBtn />
      </form>

      {blocks.length > 0 && (
        <div className="flex flex-col divide-y divide-line border-t border-line pt-2">
          {blocks.map((b) => (
            <div key={b.id} className="flex items-center justify-between py-2.5 gap-2">
              <div>
                <span className="font-semibold">{b.label}</span>
                <span className={`ms-2 text-xs font-bold rounded-full px-2 py-0.5 ${b.reason === "maintenance" ? "bg-booked-soft text-booked" : "bg-reserved-soft text-reserved"}`}>
                  {b.reason === "maintenance" ? "صيانة" : "حجز خاص"}
                </span>
              </div>
              <form action={deleteVehicleBlock}>
                <input type="hidden" name="id" value={b.id} />
                <input type="hidden" name="vehicleId" value={vehicleId} />
                <button className="text-booked font-bold text-sm rounded-lg px-3 py-1.5 hover:bg-booked-soft">حذف</button>
              </form>
            </div>
          ))}
        </div>
      )}
      {blocks.length === 0 && <p className="text-muted text-sm">مفيش أوقات مقفولة حالياً.</p>}
    </div>
  );
}

function AddBtn() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="rounded-xl px-5 py-2.5 font-bold bg-primary text-white disabled:opacity-50">
      {pending ? "…" : "اقفل الوقت"}
    </button>
  );
}
