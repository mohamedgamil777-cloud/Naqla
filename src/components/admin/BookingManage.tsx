"use client";
import { useRef } from "react";
import { adminSetBookingStatus, adminAssignDriver } from "@/app/admin/actions";
import { BOOKING_STATUS_LABEL, type BookingStatus } from "@/lib/constants";
import type { StaffDTO } from "@/data/types";

const NEXT: Record<BookingStatus, { status: BookingStatus; label: string; danger?: boolean }[]> = {
  pending: [
    { status: "confirmed", label: "أكّد الحجز" },
    { status: "cancelled", label: "إلغاء", danger: true },
  ],
  confirmed: [
    { status: "ready", label: "جاهز للاستلام" },
    { status: "cancelled", label: "إلغاء", danger: true },
  ],
  ready: [
    { status: "active", label: "بدء الإيجار" },
    { status: "cancelled", label: "إلغاء", danger: true },
  ],
  active: [{ status: "completed", label: "إنهاء وتسليم" }],
  completed: [],
  cancelled: [],
};

export function BookingManage({
  code,
  status,
  driverId,
  drivers,
}: {
  code: string;
  status: BookingStatus;
  driverId: string | null;
  drivers: StaffDTO[];
}) {
  const actions = NEXT[status];
  const driverRef = useRef<HTMLFormElement>(null);

  return (
    <div className="bg-panel border border-line rounded-card p-5 flex flex-col gap-4">
      <h2 className="font-extrabold text-lg">إدارة الحجز</h2>

      <div>
        <div className="text-sm text-muted mb-2">الحالة الحالية</div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-extrabold text-lg">{BOOKING_STATUS_LABEL[status]}</span>
        </div>
      </div>

      {actions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <form key={a.status} action={adminSetBookingStatus}>
              <input type="hidden" name="code" value={code} />
              <input type="hidden" name="status" value={a.status} />
              <button
                className={`rounded-xl px-5 py-2.5 font-bold ${
                  a.danger ? "text-booked border-2 border-booked-soft hover:bg-booked-soft" : "bg-primary text-white"
                }`}
              >
                {a.label}
              </button>
            </form>
          ))}
        </div>
      ) : (
        <p className="text-muted text-sm">مفيش إجراءات تانية على الحجز ده.</p>
      )}

      {/* Driver assignment */}
      <div className="border-t border-line pt-4">
        <div className="text-sm font-bold text-ink-2 mb-2">السائق المسؤول</div>
        <form ref={driverRef} action={adminAssignDriver}>
          <input type="hidden" name="code" value={code} />
          <select
            name="driverId"
            defaultValue={driverId ?? ""}
            onChange={() => driverRef.current?.requestSubmit()}
            className="w-full max-w-xs rounded-xl border border-line-2 bg-panel px-3 py-2.5 font-semibold"
          >
            <option value="">— بدون سائق —</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </form>
        {drivers.length === 0 && (
          <p className="text-muted text-xs mt-1.5">أضف سائقين من صفحة «الموظفين» (وظيفة: سائق).</p>
        )}
      </div>
    </div>
  );
}
