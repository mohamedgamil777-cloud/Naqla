"use client";
import { useState } from "react";
import { Icon } from "@/components/Icons";
import { SIZE_BADGE, capacityLabel, type OrderOptions, type SizeOpt } from "./model";

type CargoHintsProps = {
  hints: OrderOptions["cargo"];
  /** size code of the chosen hint */
  selected: string | null;
  onPick: (size: string) => void;
};

/** "What are you moving?" — each card suggests a size. */
export function CargoHints({ hints, selected, onPick }: CargoHintsProps) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-lg font-extrabold">ماذا ستنقل؟</h2>
      <div className="grid grid-cols-4 gap-2">
        {hints.map((h) => {
          const on = selected === h.size;
          return (
            <button
              key={h.size}
              type="button"
              onClick={() => onPick(h.size)}
              aria-pressed={on}
              className={`rounded-xl border py-3 px-1 flex flex-col items-center gap-1.5 text-center cursor-pointer ${
                on ? "border-primary ring-1 ring-primary bg-primary-soft/60" : "border-line bg-panel hover:border-line-2"
              }`}
            >
              <Icon name={h.icon} className={`w-6 h-6 ${on ? "text-primary" : "text-ink-2"}`} strokeWidth={1.7} />
              <span className="text-xs font-semibold leading-tight">{h.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

type VehiclePickerProps = {
  sizes: SizeOpt[];
  selectedId: string;
  /** the size suggested by the cargo hint */
  recommendedId: string | null;
  onSelect: (id: string) => void;
};

/** Size cards (scrollable) with an optional comparison table. */
export function VehiclePicker({ sizes, selectedId, recommendedId, onSelect }: VehiclePickerProps) {
  const [compareOpen, setCompareOpen] = useState(false);

  return (
    <section id="sec-vehicle" className="scroll-mt-20 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold flex items-center gap-1.5">
          اختر العربية المناسبة
          <Icon name="help" className="w-5 h-5 text-muted" />
        </h2>
        <button
          type="button"
          onClick={() => setCompareOpen((o) => !o)}
          className="text-sm font-bold text-primary underline underline-offset-4 flex items-center gap-1"
        >
          مقارنة العربيات
          <Icon name={compareOpen ? "chevronUp" : "chevronLeft"} className="w-4 h-4" />
        </button>
      </div>
      {compareOpen && <SizeComparison sizes={sizes} />}
      <div className="-mx-4 px-4 flex gap-2.5 overflow-x-auto snap-x pb-1 [scrollbar-width:none]">
        {sizes.map((s) => (
          <SizeCard
            key={s.id}
            size={s}
            selected={s.id === selectedId}
            recommended={s.id === recommendedId}
            onSelect={() => onSelect(s.id)}
          />
        ))}
      </div>
    </section>
  );
}

function SizeComparison({ sizes }: { sizes: SizeOpt[] }) {
  return (
    <div className="bg-panel border border-line rounded-card overflow-hidden text-sm">
      {sizes.map((s) => (
        <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-line last:border-0">
          <span
            className={`w-8 text-center rounded-full py-0.5 text-xs font-extrabold ${SIZE_BADGE[s.sizeCode] ?? "bg-panel-2"}`}
          >
            {s.sizeCode}
          </span>
          <span className="font-bold w-20 shrink-0">{s.name}</span>
          <span className="text-muted flex-1 min-w-0 truncate">{s.description}</span>
          {s.capacityKg != null && (
            <span className="text-ink-2 shrink-0">{s.capacityKg.toLocaleString("en-US")} كجم</span>
          )}
        </div>
      ))}
    </div>
  );
}

type SizeCardProps = { size: SizeOpt; selected: boolean; recommended: boolean; onSelect: () => void };

function SizeCard({ size: s, selected, recommended, onSelect }: SizeCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`relative snap-start shrink-0 w-[8.4rem] rounded-xl border p-2.5 pt-3 flex flex-col items-center gap-1 text-center cursor-pointer ${
        selected ? "border-primary ring-1 ring-primary bg-panel" : "border-line bg-panel hover:border-line-2"
      }`}
    >
      {selected && (
        <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-primary text-white grid place-items-center">
          <Icon name="check" className="w-3.5 h-3.5" strokeWidth={3.2} />
        </span>
      )}
      {recommended && (
        <span className="absolute top-2 right-2 rounded-full bg-primary-soft text-primary-ink px-2 py-0.5 text-[11px] font-bold">
          مُقترح
        </span>
      )}
      <div className="w-full aspect-[4/3] mt-3 rounded-xl overflow-hidden bg-panel-2 grid place-items-center">
        {s.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin uploads are data: URLs
          <img src={s.image} alt={s.name} className="w-full h-full object-cover" />
        ) : (
          <Icon name="truck" className="w-9 h-9 text-primary/70" strokeWidth={1.5} />
        )}
      </div>
      <span className="font-extrabold mt-1">{s.name}</span>
      <span
        className={`rounded-full px-3 py-0.5 text-xs font-extrabold ${SIZE_BADGE[s.sizeCode] ?? "bg-panel-2"}`}
      >
        {s.sizeCode}
      </span>
      {s.capacityKg != null && <span className="text-xs text-ink-2">{capacityLabel(s.capacityKg)}</span>}
      {s.dims && (
        <span className="text-[11px] text-muted" dir="ltr">
          {s.dims.replace(/×/g, " × ")} سم
        </span>
      )}
    </button>
  );
}
