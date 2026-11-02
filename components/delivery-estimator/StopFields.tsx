"use client";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/Icons";
import { addrField, detailField, type SavedAddr, type Stop } from "./model";

/** "مطلوب" until filled, then a green check. */
function RequiredTag({ done }: { done: boolean }) {
  if (done) {
    return (
      <span className="w-5 h-5 rounded-full bg-ok text-white grid place-items-center" aria-label="تم">
        <Icon name="check" className="w-3 h-3" strokeWidth={3.5} />
      </span>
    );
  }
  return (
    <span className="text-[11px] font-bold text-booked bg-booked-soft rounded-full px-2 py-0.5">مطلوب</span>
  );
}

const STOP_LOOK: Record<
  Stop,
  { title: string; icon: IconName; iconClass: string; label: string; detailsLabel: string }
> = {
  a: {
    title: "مكان الاستلام",
    icon: "mapPin",
    iconClass: "bg-booked-soft text-booked",
    label: "عنوان الاستلام",
    detailsLabel: "تفاصيل الاستلام",
  },
  b: {
    title: "مكان التسليم",
    icon: "flag",
    iconClass: "bg-primary-soft text-primary",
    label: "عنوان التسليم",
    detailsLabel: "تفاصيل التسليم",
  },
};

type StopFieldsProps = {
  stop: Stop;
  address: string;
  details: string;
  onAddress: (value: string) => void;
  onDetails: (value: string) => void;
  onFocus: () => void;
  /** show the address as missing (after a failed order attempt) */
  missing: boolean;
  /** button beside the title ("موقعي" / "الخريطة") */
  action: ReactNode;
  children?: ReactNode;
};

/** One stop of the trip: title, address, optional details, and saved-address chips (children). */
export function StopFields({
  stop,
  address,
  details,
  onAddress,
  onDetails,
  onFocus,
  missing,
  action,
  children,
}: StopFieldsProps) {
  const look = STOP_LOOK[stop];

  return (
    <div className="p-4 flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span className={`w-10 h-10 shrink-0 rounded-full grid place-items-center ${look.iconClass}`}>
          <Icon name={look.icon} className="w-5 h-5" />
        </span>
        <span className="flex-1 min-w-0 flex items-center gap-2 font-extrabold text-lg whitespace-nowrap">
          {look.title} <RequiredTag done={!!address.trim()} />
        </span>
        {action}
      </div>
      <input
        value={address}
        onChange={(e) => onAddress(e.target.value)}
        onFocus={onFocus}
        placeholder="المنطقة، الشارع، رقم العمارة"
        aria-label={look.label}
        aria-invalid={missing ? true : undefined}
        className={addrField(missing)}
      />
      <input
        value={details}
        onChange={(e) => onDetails(e.target.value)}
        placeholder="الدور، الشقة، علامة مميزة (اختياري)"
        aria-label={look.detailsLabel}
        className={detailField}
      />
      {children}
    </div>
  );
}

type SavedAddressChipsProps = {
  saved: SavedAddr[];
  /** the address currently typed for this stop */
  value: string;
  message: string | null;
  onPick: (address: SavedAddr) => void;
  onSave: () => void;
};

/** Saved-address chips + "⭐ احفظ" under an address (signed-in customers only). */
export function SavedAddressChips({ saved, value, message, onPick, onSave }: SavedAddressChipsProps) {
  const typed = value.trim();
  const alreadySaved = saved.some((a) => a.address === typed);

  return (
    <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] -mx-1 px-1">
      {saved.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onPick(a)}
          className="shrink-0 rounded-full border border-line-2 bg-panel px-3 py-1.5 text-sm font-bold text-ink-2 hover:border-primary hover:text-primary"
        >
          📍 {a.label}
        </button>
      ))}
      {typed && !alreadySaved && (
        <button
          type="button"
          onClick={onSave}
          className="shrink-0 rounded-full bg-primary-soft text-primary-ink px-3 py-1.5 text-sm font-bold"
        >
          ⭐ احفظ العنوان
        </button>
      )}
      {message && <span className="shrink-0 text-sm font-bold text-ok">{message}</span>}
    </div>
  );
}
