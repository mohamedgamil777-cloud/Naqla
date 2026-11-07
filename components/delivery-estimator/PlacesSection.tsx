"use client";
import { useState, type ReactNode, type RefObject } from "react";
import { Icon } from "@/components/Icons";
import type { Stop } from "./model";

const pillButton =
  "shrink-0 flex items-center gap-1.5 text-sm font-bold text-primary rounded-full border border-line px-2.5 py-1.5 hover:bg-primary-soft disabled:opacity-50";

/** GPS: puts this stop's pin at the phone's current location. */
export function LocateButton({
  locating,
  disabled = locating,
  onClick,
}: {
  locating: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={pillButton}>
      <Icon name="locate" className="w-4 h-4" />
      {locating ? "بنحدد مكانك…" : "الموقع على الخريطة"}
    </button>
  );
}

export function MapToggleButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-expanded={open} className={pillButton}>
      <Icon name="map" className="w-4 h-4" />
      الخريطة
    </button>
  );
}

/** Dashed divider between the two stops, with the swap button. */
export function SwapDivider({ onSwap }: { onSwap: () => void }) {
  return (
    <div className="relative h-0">
      <span className="absolute inset-x-4 top-0 border-t border-dashed border-line-2" aria-hidden />
      <button
        type="button"
        onClick={onSwap}
        aria-label="بدّل الاستلام والتسليم"
        className="absolute left-6 -top-[18px] w-9 h-9 rounded-full bg-panel border border-line grid place-items-center text-ink-2 hover:text-primary"
      >
        <Icon name="swap" className="w-4 h-4" />
      </button>
    </div>
  );
}

type MapPanelProps = {
  open: boolean;
  error: boolean;
  active: Stop;
  onActive: (stop: Stop) => void;
  container: RefObject<HTMLDivElement | null>;
};

/** Collapsible map: choose which pin a tap moves, then tap / drag on the map. */
export function MapPanel({ open, error, active, onActive, container }: MapPanelProps) {
  const toggle = (stop: Stop, on: string) =>
    `rounded-lg py-2 text-sm font-semibold border cursor-pointer ${active === stop ? on : "border-line-2 bg-panel text-ink-2 hover:bg-panel-2"}`;

  return (
    <div className={open ? "block" : "hidden"}>
      <div className="px-4 pb-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onActive("a")}
          className={toggle("a", "border-booked bg-booked-soft text-booked")}
        >
          حدّد الاستلام
        </button>
        <button
          type="button"
          onClick={() => onActive("b")}
          className={toggle("b", "border-primary bg-primary-soft text-primary")}
        >
          حدّد التسليم
        </button>
      </div>
      {error ? (
        <div className="mx-4 mb-3 h-52 lg:h-80 grid place-items-center rounded-xl bg-panel-2 text-center text-muted p-4 text-sm">
          الخريطة مش متاحة دلوقتي. عدّل المسافة يدوياً.
        </div>
      ) : (
        <div ref={container} className="mx-4 mb-3 h-56 lg:h-80 rounded-xl overflow-hidden bg-panel-2" />
      )}
    </div>
  );
}

/** Estimated distance, editable by hand when the pins are off. */
export function DistanceBar({ km, onChange }: { km: number; onChange: (km: number) => void }) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="m-3 mt-0 rounded-2xl bg-primary-soft px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-baseline gap-2">
        <span className="text-sm text-ink-2">المسافة المتوقعة</span>
        {editing ? (
          <input
            type="number"
            min="0"
            step="0.5"
            autoFocus
            value={km}
            onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
            onBlur={() => setEditing(false)}
            className="w-20 rounded-lg border border-primary bg-panel px-2 py-0.5 text-lg font-extrabold text-center"
          />
        ) : (
          <span className="text-2xl font-extrabold text-emph">{km}</span>
        )}
        <span className="font-bold">كم</span>
      </div>
      <button
        type="button"
        onClick={() => setEditing((v) => !v)}
        className="flex items-center gap-1.5 text-primary font-bold"
      >
        <Icon name="pencil" className="w-4 h-4" /> {editing ? "تم" : "تعديل"}
      </button>
    </div>
  );
}

export function PlacesCard({ children }: { children: ReactNode }) {
  return (
    <section
      id="sec-places"
      className="scroll-mt-20 bg-panel border border-line rounded-card overflow-hidden"
    >
      {children}
    </section>
  );
}
