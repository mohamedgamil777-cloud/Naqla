"use client";
import { useState } from "react";
import Link from "next/link";
import { ImageField } from "@/components/admin/ImageField";
import { Icon } from "@/components/Icons";
import type { FleetDriver, VehicleAdminInfo } from "@/types";

const inp =
  "w-full rounded-xl border border-line-2 bg-panel px-3 py-2.5 text-base outline-none focus:border-primary";
const lbl = "block text-sm font-bold text-ink-2 mb-1.5";

/** Admin vehicle form: the driver (from الموظفين), the owner when it is someone else, the licence, notes. */
export function VehicleOwnerFields({ drivers, admin }: { drivers: FleetDriver[]; admin?: VehicleAdminInfo }) {
  const [driverId, setDriverId] = useState(admin?.driverId ?? "");
  const [ownerIsDriver, setOwnerIsDriver] = useState(admin?.ownerIsDriver ?? true);
  const driver = drivers.find((d) => d.id === driverId) ?? null;

  return (
    <>
      <fieldset className="bg-panel border border-line rounded-card p-5">
        <legend className="font-extrabold px-2">السواق وصاحب العربية</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <label>
            <span className={lbl}>السواق</span>
            <select
              className={inp}
              name="driverId"
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
            >
              <option value="">— من غير سواق —</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name || d.phone}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted mt-1 block">
              بيانات السواق وصورته بتتسجل من{" "}
              <Link href="/admin/staff" className="text-primary font-bold">
                الموظفين
              </Link>
              .
            </span>
          </label>
          {driver ? <DriverSummary d={driver} /> : <div />}
          <label className="flex items-center gap-3 md:col-span-2">
            <input
              type="checkbox"
              name="ownerIsDriver"
              checked={ownerIsDriver}
              onChange={(e) => setOwnerIsDriver(e.target.checked)}
              className="w-5 h-5"
            />
            <span className="font-bold">السواق هو صاحب العربية</span>
          </label>
          {!ownerIsDriver && (
            <>
              <label>
                <span className={lbl}>اسم صاحب العربية</span>
                <input className={inp} name="ownerName" defaultValue={admin?.ownerName ?? ""} />
              </label>
              <label>
                <span className={lbl}>موبايل صاحب العربية</span>
                <input
                  className={inp}
                  name="ownerPhone"
                  dir="ltr"
                  inputMode="tel"
                  defaultValue={admin?.ownerPhone ?? ""}
                />
              </label>
              <label>
                <span className={lbl}>الرقم القومي</span>
                <input
                  className={inp}
                  name="ownerNationalId"
                  dir="ltr"
                  inputMode="numeric"
                  defaultValue={admin?.ownerNationalId ?? ""}
                />
              </label>
              <ImageField
                name="ownerPhoto"
                label="صورة صاحب العربية"
                defaultValue={admin?.ownerPhoto}
                camera={false}
                maxWidth={600}
              />
            </>
          )}
        </div>
      </fieldset>

      <fieldset className="bg-panel border border-line rounded-card p-5">
        <legend className="font-extrabold px-2">رخصة العربية وملاحظات</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <label>
            <span className={lbl}>رقم رخصة العربية</span>
            <input className={inp} name="licenseNumber" dir="ltr" defaultValue={admin?.licenseNumber ?? ""} />
          </label>
          <label>
            <span className={lbl}>تاريخ انتهاء الرخصة</span>
            <input
              className={inp}
              name="licenseExpiry"
              type="date"
              defaultValue={admin?.licenseExpiry ?? ""}
            />
          </label>
          <div className="md:col-span-2">
            <ImageField
              name="licensePhoto"
              label="صورة رخصة العربية"
              defaultValue={admin?.licensePhoto}
              wide
            />
          </div>
          <label className="md:col-span-2">
            <span className={lbl}>ملاحظات (للإدارة بس)</span>
            <textarea className={inp} name="notes" rows={3} defaultValue={admin?.notes ?? ""} />
          </label>
        </div>
      </fieldset>
    </>
  );
}

function DriverSummary({ d }: { d: FleetDriver }) {
  return (
    <div className="flex items-center gap-3 bg-panel-2 rounded-xl p-3">
      <div className="w-14 h-14 rounded-full overflow-hidden bg-panel border border-line-2 grid place-items-center shrink-0">
        {d.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.photo} alt={d.name} className="w-full h-full object-cover" />
        ) : (
          <Icon name="user" className="w-6 h-6 text-muted" />
        )}
      </div>
      <div className="text-sm min-w-0">
        <div className="font-extrabold truncate">{d.name || "—"}</div>
        <div className="text-muted" dir="ltr">
          {d.phone}
        </div>
        <div className="text-xs text-muted">
          {[d.hasNationalId ? "بطاقة ✓" : "بطاقة ✗", d.hasDrivingLicense ? "رخصة قيادة ✓" : "رخصة قيادة ✗"].join(
            " · ",
          )}
        </div>
      </div>
    </div>
  );
}
