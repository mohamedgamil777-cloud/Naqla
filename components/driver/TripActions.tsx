"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { driverAdvanceTrip, type DriverActionState } from "@/app/driver/actions";
import type { BookingStatus } from "@/lib/constants";

/** Big, single-tap status buttons the driver uses on the road. */
export function TripActions({ code, status }: { code: string; status: BookingStatus }) {
  const [state, action] = useActionState<DriverActionState, FormData>(driverAdvanceTrip, { ok: false });

  if (status === "completed" || status === "cancelled") return null;

  const canStart = status === "confirmed" || status === "ready";
  const canFinish = status === "active";
  if (!canStart && !canFinish) return null;

  return (
    <form action={action} className="mt-1">
      <input type="hidden" name="code" value={code} />
      {state.error && (
        <div className="bg-booked-soft text-booked rounded-xl px-3 py-2 text-sm font-bold mb-2">{state.error}</div>
      )}
      {canStart && <Btn to="active" className="bg-ok text-white" label="🚦 بدأت الرحلة" />}
      {canFinish && <Btn to="completed" className="bg-primary text-white" label="✅ سلّمت العربية وخلّصت" />}
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
