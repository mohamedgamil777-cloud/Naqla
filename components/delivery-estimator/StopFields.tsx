"use client";
import type { ReactNode } from "react";
import { Icon } from "@/components/Icons";
import type { LatLng } from "@/lib/google-maps";
import { detailField, type SavedAddr, type Stop, type StopState } from "./model";
import { PlaceSearch } from "./PlaceSearch";

/** "مطلوب" until filled, then a check. */
function RequiredTag({ done }: { done: boolean }) {
  if (done) {
    return (
      <Icon
        name="check"
        className="w-4 h-4 text-ok"
        strokeWidth={3}
        aria-label="تم"
        role="img"
        aria-hidden={false}
      />
    );
  }
  return <span className="text-xs font-medium text-muted">مطلوب</span>;
}

const STOP_LOOK: Record<Stop, { title: string; marker: string; label: string; detailsLabel: string }> = {
  a: {
    title: "مكان الاستلام",
    marker: "rounded-full border-[3px] border-booked bg-panel",
    label: "عنوان الاستلام",
    detailsLabel: "تفاصيل الاستلام",
  },
  b: {
    title: "مكان التسليم",
    marker: "", // drawn as a location pin (see StopFields)
    label: "عنوان التسليم",
    detailsLabel: "تفاصيل التسليم",
  },
};

type StopFieldsProps = {
  stop: Stop;
  value: StopState;
  apiKey: string;
  /** maps unavailable → plain address field, no pin required */
  plain: boolean;
  near: LatLng;
  /** the street address is being looked up for a freshly placed pin */
  resolving: boolean;
  onFocus: () => void;
  /** picked from search: point + address */
  onPick: (point: LatLng, address: string) => void;
  onChange: (patch: Partial<StopState>) => void;
  /** show the stop as missing (after a failed order attempt) */
  missing: boolean;
  /** button beside the title ("موقعي" / "الخريطة") */
  action: ReactNode;
  children?: ReactNode;
};

const smallLabel = "block mb-1 text-xs font-semibold text-muted";

/**
 * One stop of the trip: search (or tap the map) → the street address comes from Google → the customer
 * adds building, floor, apartment and a landmark. Saved-address chips come in as children.
 */
export function StopFields({
  stop,
  value,
  apiKey,
  plain,
  near,
  resolving,
  onFocus,
  onPick,
  onChange,
  missing,
  action,
  children,
}: StopFieldsProps) {
  const look = STOP_LOOK[stop];
  const located = plain ? !!value.address.trim() : !!value.point;

  return (
    <div className="p-4 flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* same stop markers as the map pins and the home-page form */}
        {stop === "b" ? (
          <Icon name="mapPin" className="w-5 h-5 shrink-0 text-primary" strokeWidth={2.2} />
        ) : (
          <span className={`w-4 h-4 shrink-0 ${look.marker}`} aria-hidden />
        )}
        <span className="flex-1 flex items-center gap-2 font-semibold whitespace-nowrap">
          {look.title} <RequiredTag done={located} />
        </span>
        {action}
      </div>
      <PlaceSearch
        apiKey={apiKey}
        plain={plain}
        address={value.address}
        near={value.point ?? near}
        label={look.label}
        missing={missing}
        onFocus={onFocus}
        onPick={onPick}
        onType={(address) => onChange({ address })}
      />
      {!plain && (resolving || !value.point) && (
        <p className="text-[13px] text-muted -mt-1" aria-live="polite">
          {resolving ? "بنجيب العنوان…" : "اختار من نتايج البحث، أو اضغط على الخريطة لتحديد المكان بالظبط."}
        </p>
      )}

      {located && (
        <fieldset className="flex flex-col gap-2.5">
          <legend className="sr-only">{look.detailsLabel}</legend>
          <div className="grid grid-cols-3 gap-2">
            <label>
              <span className={smallLabel}>رقم العمارة</span>
              <input
                value={value.building}
                onChange={(e) => onChange({ building: e.target.value })}
                className={detailField}
                maxLength={20}
              />
            </label>
            <label>
              <span className={smallLabel}>الدور</span>
              <input
                value={value.floor}
                onChange={(e) => onChange({ floor: e.target.value })}
                className={detailField}
                maxLength={20}
              />
            </label>
            <label>
              <span className={smallLabel}>الشقة</span>
              <input
                value={value.apartment}
                onChange={(e) => onChange({ apartment: e.target.value })}
                className={detailField}
                maxLength={20}
              />
            </label>
          </div>
          <label>
            <span className={smallLabel}>علامة مميزة (اختياري)</span>
            <input
              value={value.landmark}
              onChange={(e) => onChange({ landmark: e.target.value })}
              placeholder="مثلاً: قدام الصيدلية، البوابة التانية"
              className={detailField}
              maxLength={120}
            />
          </label>
        </fieldset>
      )}
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

/** Saved-address chips + "احفظ العنوان" under an address (signed-in customers only). */
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
          <Icon name="mapPin" className="w-4 h-4 inline-block align-[-3px] me-1.5" />
          {a.label}
        </button>
      ))}
      {typed && !alreadySaved && (
        <button
          type="button"
          onClick={onSave}
          className="shrink-0 rounded-full bg-primary-soft text-primary-ink px-3 py-1.5 text-sm font-bold"
        >
          <Icon name="star" className="w-4 h-4 inline-block align-[-3px] me-1.5" />
          احفظ العنوان
        </button>
      )}
      {message && <span className="shrink-0 text-sm font-bold text-ok">{message}</span>}
    </div>
  );
}
