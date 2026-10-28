"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { extendBookingAction, type FormState } from "@/app/admin/actions";
import { durationLabel } from "@/lib/client-time";

export function ExtendTrip({ code, currentHours, status }: { code: string; currentHours: number; status: string }) {
  const [state, action] = useActionState<FormState, FormData>(extendBookingAction, { ok: false });
  if (status === "completed" || status === "cancelled") return null;

  return (
    <div className="bg-panel border border-line rounded-card p-5 flex flex-col gap-3">
      <div>
        <h2 className="font-extrabold text-lg">تعديل مدة الرحلة (مدّ الإيجار)</h2>
        <p className="text-sm text-muted">
          لو السائق بلّغك إن الرحلة هتاخد وقت أطول، غيّر عدد الساعات — المطلوب هيتحدّث تلقائياً ويظهر في المتبقّي.
        </p>
      </div>
      {state.error && <div className="bg-booked-soft text-booked rounded-xl px-3 py-2 text-sm font-semibold">{state.error}</div>}
      {state.ok && <div className="bg-ok-soft text-ok rounded-xl px-3 py-2 text-sm font-semibold">تم تعديل المدة والسعر ✅</div>}
      <form action={action} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="code" value={code} />
        <label>
          <span className="block text-xs font-bold text-ink-2 mb-1">
            المدة الجديدة (ساعات) — حالياً {durationLabel(currentHours)}
          </span>
          <input
            name="hours"
            type="number"
            min="1"
            max="336"
            defaultValue={currentHours}
            className="w-44 rounded-xl border border-line-2 bg-panel px-3 py-2.5 text-lg"
          />
        </label>
        <SaveBtn />
      </form>
    </div>
  );
}

function SaveBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-2xl px-6 py-3 font-bold bg-primary text-white disabled:opacity-50">
      {pending ? "بيحفظ…" : "حفظ المدة الجديدة"}
    </button>
  );
}
