"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { driverAdvanceOrder, type DriverActionState } from "@/app/driver/actions";

/** Big single-tap buttons: assigned → "أنا في الطريق" → "تم التوصيل". */
export function OrderActions({ code, status }: { code: string; status: string }) {
  const [state, action] = useActionState<DriverActionState, FormData>(driverAdvanceOrder, { ok: false });

  if (status !== "assigned" && status !== "en_route") return null;

  return (
    <form action={action} className="mt-1">
      <input type="hidden" name="code" value={code} />
      {state.error && (
        <div className="bg-booked-soft text-booked rounded-xl px-3 py-2 text-sm font-bold mb-2">{state.error}</div>
      )}
      {status === "assigned" && <Btn to="en_route" label="🚦 أنا في الطريق" className="bg-ok text-white" />}
      {status === "en_route" && <Btn to="completed" label="✅ تم التوصيل" className="bg-primary text-white" />}
    </form>
  );
}

function Btn({ to, label, className }: { to: string; label: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="to"
      value={to}
      disabled={pending}
      className={`w-full rounded-2xl py-4 text-xl font-extrabold tap disabled:opacity-50 ${className}`}
    >
      {pending ? "لحظة…" : label}
    </button>
  );
}
