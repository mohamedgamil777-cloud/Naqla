"use client";
import type { ReactNode } from "react";
import { fullDateLabel, hourLabel, durationLabel } from "@/lib/client-time";
import { KIND_LABEL, type VehicleKind } from "@/lib/constants";
import type { VehicleListItem } from "@/types";

export type Step = "kind" | "vehicle" | "when" | "time" | "duration" | "place" | "review";
export const STEP_ORDER: Step[] = ["kind", "vehicle", "when", "time", "duration", "place", "review"];
export type SlotDTO = { hour24: number; startISO: string; status: "available" | "booked" | "unavailable" };
export type Alt = { startISO: string; startLabel: string };
export type Place = "branch" | "delivery";
export type DeliveryAddress = {
  area: string;
  street: string;
  building: string;
  floor: string;
  apt: string;
  landmark: string;
};

const STEPS_LABELS = ["العربية", "الوقت", "المدة", "المكان", "المراجعة"];

function stepIndex(s: Step): number {
  if (s === "kind" || s === "vehicle") return 0;
  if (s === "when" || s === "time") return 1;
  if (s === "duration") return 2;
  if (s === "place") return 3;
  return 4;
}

export function Stepper({ step }: { step: Step }) {
  const current = stepIndex(step);
  return (
    <div className="flex items-center gap-1.5">
      {STEPS_LABELS.map((label, i) => (
        <div key={label} className="flex-1 flex flex-col items-center gap-1">
          <div className={`h-1.5 w-full rounded-full ${i <= current ? "bg-primary" : "bg-line-2"}`} />
          <span className={`text-[11px] font-semibold ${i === current ? "text-emph" : "text-muted"}`}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

type ChosenSummaryProps = {
  vehicle?: VehicleListItem;
  kind?: VehicleKind;
  dateISO: string | null;
  startHour: number | null;
  hours: number | null;
};

/** Chips of what the customer has picked so far. */
export function ChosenSummary({ vehicle, kind, dateISO, startHour, hours }: ChosenSummaryProps) {
  const chips: string[] = [];
  if (vehicle) chips.push(vehicle.name);
  else if (kind) chips.push(KIND_LABEL[kind]);
  if (dateISO) chips.push(fullDateLabel(dateISO));
  if (startHour != null) chips.push(hourLabel(startHour));
  if (hours) chips.push(durationLabel(hours));
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <span
          key={chip}
          className="bg-primary-soft text-primary-ink rounded-full px-3 py-1 text-sm font-semibold"
        >
          {chip}
        </span>
      ))}
    </div>
  );
}

export function StepCard({
  title,
  children,
  onBack,
}: {
  title: string;
  children: ReactNode;
  onBack: () => void;
}) {
  return (
    <div className="bg-panel border border-line rounded-card p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="رجوع"
          className="tap w-11 h-11 rounded-full bg-panel-2 grid place-items-center text-2xl font-extrabold text-primary shrink-0 hover:bg-primary-soft"
        >
          →
        </button>
        <h2 className="text-xl font-extrabold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

type BigChoiceProps = { icon?: string; label: string; onClick: () => void; active?: boolean };

export function BigChoice({ icon, label, onClick, active }: BigChoiceProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tap rounded-2xl py-4 px-3 font-extrabold text-lg flex flex-col items-center gap-1.5 border-2 transition ${
        active
          ? "border-primary bg-primary-soft text-primary-ink"
          : "border-line-2 bg-panel hover:border-primary"
      }`}
    >
      {icon && (
        <span className="text-3xl" aria-hidden>
          {icon}
        </span>
      )}
      {label}
    </button>
  );
}

export function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{k}</span>
      <span className="font-semibold">{v}</span>
    </div>
  );
}
