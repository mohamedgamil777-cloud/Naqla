"use client";
import { useState, type ReactNode, type RefObject } from "react";
import { Icon } from "@/components/Icons";
import type { Stop } from "./model";

const pillButton =
  "shrink-0 min-h-10 flex items-center gap-1.5 text-sm font-bold text-primary rounded-full border border-line-2 bg-panel px-3 py-1.5 cursor-pointer hover:bg-primary-soft disabled:opacity-50";

/** A stop's two ways to set it besides search: GPS (only when tapped) and the map. */
export function StopActions({
  locating,
  busy,
  onLocate,
  mapOpen,
  onMap,
}: {
  /** this stop's GPS lookup is running */
  locating: boolean;
  /** any GPS lookup is running */
  busy: boolean;
  onLocate: () => void;
  /** null = no map (Google Maps unavailable) */
  mapOpen: boolean | null;
  onMap: () => void;
}) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <button type="button" onClick={onLocate} disabled={busy} className={pillButton}>
        <Icon name="locate" className={`w-4 h-4 text-accent ${locating ? "animate-pulse" : ""}`} strokeWidth={2.2} />
        {locating ? "بنحدد مكانك…" : "استخدم موقعي الحالي"}
      </button>
      {mapOpen !== null && (
        <button type="button" onClick={onMap} aria-expanded={mapOpen} className={pillButton}>
          <Icon name="map" className="w-4 h-4" />
          {mapOpen ? "اقفل الخريطة" : "حدد على الخريطة"}
        </button>
      )}
    </span>
  );
}

/** No price: the server couldn't measure the trip. Explains why and offers a retry. */
export function RouteProblem({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="m-3 mt-0 rounded-2xl border border-booked/30 bg-booked-soft px-4 py-3 flex flex-col gap-2">
      <p className="text-sm font-semibold text-booked flex items-start gap-2">
        <Icon name="alert" className="w-5 h-5 shrink-0" />
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="self-start rounded-full border border-booked/40 bg-panel px-3 py-1.5 text-sm font-bold text-booked cursor-pointer"
      >
        جرّب تاني
      </button>
    </div>
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
export function DistanceBar({
  km,
  source,
  measuring,
  onChange,
}: {
  km: number;
  /** road = Google route, straight = estimated from the pins, customer = typed (old fallback) */
  source: "road" | "straight" | "customer" | null;
  measuring: boolean;
  /** null = the server measured it; the customer can't change it */
  onChange: ((km: number) => void) | null;
}) {
  const [editing, setEditing] = useState(false);
  const label = source === "road" ? "المسافة بالطريق" : "المسافة المتوقعة";

  return (
    <div className="m-3 mt-0 rounded-2xl bg-primary-soft px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-baseline gap-2" aria-live="polite">
        <span className="text-sm text-ink-2">{label}</span>
        {editing && onChange ? (
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
          <span className={`text-2xl font-extrabold text-emph ${measuring ? "opacity-40" : ""}`}>{km}</span>
        )}
        <span className="font-bold">كم</span>
        {measuring && <span className="text-xs text-muted">بنحسب…</span>}
      </div>
      {onChange && (
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="flex items-center gap-1.5 text-primary font-bold"
        >
          <Icon name="pencil" className="w-4 h-4" /> {editing ? "تم" : "تعديل"}
        </button>
      )}
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
