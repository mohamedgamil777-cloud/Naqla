"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { driverCompleteOrder, type DriverActionState } from "@/app/driver/actions";

/** Big single-tap "done" button for an assigned delivery order. */
export function OrderActions({ code, status }: { code: string; status: string }) {
  const [state, action] = useActionState<DriverActionState, FormData>(driverCompleteOrder, { ok: false });
  if (status !== "assigned") return null;
  return (
    <form action={action} className="mt-1">
      <input type="hidden" name="code" value={code} />
      {state.error && (
        <div className="bg-booked-soft text-booked rounded-xl px-3 py-2 text-sm font-bold mb-2">{state.error}</div>
      )}
      <Btn />
    </form>
  );
}

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-2xl py-4 text-xl font-extrabold tap bg-primary text-white disabled:opacity-50"
    >
      {pending ? "لحظة…" : "✅ خلّصت التوصيلة"}
    </button>
  );
}
