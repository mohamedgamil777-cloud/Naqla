"use client";
import type { ReactNode } from "react";
import { Icon } from "@/components/Icons";
import { addrField, detailField, type SavedAddr, type Stop } from "./model";

/** "مطلوب" until filled, then a check. */
function RequiredTag({ done }: { done: boolean }) {
  if (done) {
    return <Icon name="check" className="w-4 h-4 text-ok" strokeWidth={3} aria-label="تم" role="img" aria-hidden={false} />;
  }
  return <span className="text-xs font-medium text-muted">مطلوب</span>;
}

const STOP_LOOK: Record<
  Stop,
  { title: string; marker: string; label: string; detailsLabel: string }
> = {
  a: {
    title: "مكان الاستلام",
    marker: "rounded-full border-[3px] border-booked bg-panel",
    label: "عنوان الاستلام",
    detailsLabel: "تفاصيل الاستلام",
  },
  b: {
    title: "مكان التسليم",
    marker: "rounded-[4px] bg-primary",
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
        {/* same stop markers as the map pins and the home-page form */}
        <span className={`w-4 h-4 shrink-0 ${look.marker}`} aria-hidden />
        <span className="flex-1 min-w-0 flex items-center gap-2 font-semibold whitespace-nowrap">
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
          <Icon name="mapPin" className="w-4 h-4 inline-block align-[-3px] me-1.5" />{a.label}
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
