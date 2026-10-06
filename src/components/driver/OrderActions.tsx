"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { driverAdvanceOrder, type DriverActionState } from "@/app/driver/actions";
import { Icon } from "@/components/Icons";

/** The ONE big amber step for the driver, by status:
 *  assigned → "ابدأ الرحلة" · en_route → "تم الوصول لموقع الاستلام" · arrived → "تم التوصيل". */
const NEXT: Record<string, { to: string; label: string }> = {
  assigned: { to: "en_route", label: "ابدأ الرحلة" },
  en_route: { to: "arrived", label: "تم الوصول لموقع الاستلام" },
  arrived: { to: "completed", label: "تم التوصيل" },
};

export function OrderActions({ code, status, openTrip = false }: { code: string; status: string; openTrip?: boolean }) {
  const [state, action] = useActionState<DriverActionState, FormData>(driverAdvanceOrder, { ok: false });
  const next = NEXT[status];
  if (!next) return null;

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="to" value={next.to} />
      {openTrip && <input type="hidden" name="open" value="trip" />}
      {state.error && <div className="bg-booked-soft text-booked rounded-xl px-3 py-2 font-bold text-center">{state.error}</div>}
      <SubmitBtn label={next.label} />
    </form>
  );
}

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full min-h-[60px] rounded-2xl bg-accent text-on-accent text-xl font-extrabold flex items-center justify-center gap-2 shadow-[0_6px_16px_rgba(242,165,65,0.35)] hover:brightness-105 disabled:opacity-60"
    >
      {pending ? "لحظة…" : label}
      {!pending && <Icon name="chevronLeft" className="w-6 h-6" strokeWidth={2.6} />}
    </button>
  );
}
