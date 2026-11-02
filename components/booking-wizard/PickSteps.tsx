"use client";
import { VehicleImage } from "@/components/VehicleImage";
import { inputClass } from "@/components/ui";
import { cairoDateISO, dayLabel, durationLabel, hourLabel } from "@/lib/client-time";
import { formatEgp } from "@/lib/money";
import type { VehicleKind } from "@/lib/constants";
import type { VehicleListItem } from "@/types";
import { BigChoice, StepCard, type SlotDTO } from "./parts";

export function KindStep({ onPick, onBack }: { onPick: (kind: VehicleKind) => void; onBack: () => void }) {
  return (
    <StepCard title="محتاج نوع إيه؟" onBack={onBack}>
      <div className="grid grid-cols-2 gap-3">
        <BigChoice icon="truck" label="بيك أب" onClick={() => onPick("pickup")} />
        <BigChoice icon="van" label="فان" onClick={() => onPick("van")} />
      </div>
    </StepCard>
  );
}

type VehicleStepProps = {
  vehicles: VehicleListItem[];
  onPick: (vehicle: VehicleListItem) => void;
  onBack: () => void;
};

export function VehicleStep({ vehicles, onPick, onBack }: VehicleStepProps) {
  return (
    <StepCard title="اختار العربية" onBack={onBack}>
      <div className="flex flex-col md:grid md:grid-cols-2 gap-3">
        {vehicles.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => onPick(v)}
            disabled={v.status !== "available"}
            className="tap flex items-center gap-3 bg-panel border-2 border-line-2 rounded-2xl p-3 text-start disabled:opacity-40 enabled:hover:border-primary"
          >
            <div className="relative w-24 h-16 rounded-xl overflow-hidden bg-panel-2 shrink-0">
              <VehicleImage src={v.primaryImage} alt={v.name} sizes="96px" />
            </div>
            <div className="flex-1">
              <div className="font-extrabold">{v.name}</div>
              <div className="text-emph font-bold">
                {formatEgp(v.fromHourlyPiastres, { withUnit: false })}{" "}
                <span className="text-muted text-sm font-normal">جنيه/ساعة</span>
              </div>
            </div>
            <span className="text-2xl text-primary" aria-hidden>
              ‹
            </span>
          </button>
        ))}
        {vehicles.length === 0 && (
          <p className="text-muted text-center py-6">مفيش عربيات من النوع ده حالياً.</p>
        )}
      </div>
    </StepCard>
  );
}

export function WhenStep({ onPick, onBack }: { onPick: (dateISO: string) => void; onBack: () => void }) {
  return (
    <StepCard title="هتحتاجها إمتى؟" onBack={onBack}>
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((offset) => (
          <BigChoice key={offset} label={dayLabel(offset)} onClick={() => onPick(cairoDateISO(offset))} />
        ))}
      </div>
      <label className="block mt-3">
        <span className="block mb-2 font-bold">أو اختار يوم</span>
        <input
          type="date"
          min={cairoDateISO(0)}
          max={cairoDateISO(30)}
          className={inputClass}
          onChange={(e) => e.target.value && onPick(e.target.value)}
        />
      </label>
    </StepCard>
  );
}

const SLOT_LOOK: Record<SlotDTO["status"], { cls: string; label: string }> = {
  available: { cls: "bg-panel border-2 border-line-2 hover:border-primary", label: "متاح" },
  booked: { cls: "bg-booked-soft text-booked border-2 border-transparent", label: "محجوز" },
  unavailable: { cls: "bg-off-soft text-off border-2 border-transparent", label: "مش متاح" },
};

type TimeStepProps = {
  slots: SlotDTO[] | null;
  loading: boolean;
  onPick: (slot: SlotDTO) => void;
  onBack: () => void;
};

export function TimeStep({ slots, loading, onPick, onBack }: TimeStepProps) {
  const noneFree = !!slots && slots.every((s) => s.status !== "available");

  return (
    <StepCard title="اختار الوقت" onBack={onBack}>
      {loading && <p className="text-muted text-center py-6">بنحمّل المواعيد…</p>}
      {slots && (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2.5">
          {slots.map((s) => (
            <button
              key={s.hour24}
              type="button"
              disabled={s.status !== "available"}
              onClick={() => onPick(s)}
              className={`tap rounded-xl py-3 font-bold text-center disabled:cursor-not-allowed ${SLOT_LOOK[s.status].cls}`}
            >
              {hourLabel(s.hour24)}
              <span className="block text-xs font-normal mt-0.5">{SLOT_LOOK[s.status].label}</span>
            </button>
          ))}
        </div>
      )}
      {noneFree && (
        <p className="text-muted text-center mt-4">مفيش مواعيد متاحة في اليوم ده، جرب يوم تاني.</p>
      )}
    </StepCard>
  );
}

type DurationStepProps = { durations: number[]; onPick: (hours: number) => void; onBack: () => void };

export function DurationStep({ durations, onPick, onBack }: DurationStepProps) {
  return (
    <StepCard title="هتحتاجها كام ساعة؟" onBack={onBack}>
      <div className="grid grid-cols-2 gap-3">
        {durations.map((d) => (
          <BigChoice key={d} label={durationLabel(d)} onClick={() => onPick(d)} />
        ))}
      </div>
    </StepCard>
  );
}
