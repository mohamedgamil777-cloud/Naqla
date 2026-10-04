"use client";
import { useRef } from "react";
import { setVehicleStatus } from "@/app/admin/actions";
import { VEHICLE_STATUS_LABEL, VEHICLE_STATUSES, type VehicleStatus } from "@/lib/constants";

export function QuickStatus({ id, status }: { id: string; status: VehicleStatus }) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={setVehicleStatus} className="inline-flex">
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-lg border border-line-2 bg-panel px-2 py-1.5 text-sm font-semibold"
        aria-label="تغيير الحالة"
      >
        {VEHICLE_STATUSES.map((s) => (
          <option key={s} value={s}>{VEHICLE_STATUS_LABEL[s]}</option>
        ))}
      </select>
    </form>
  );
}
