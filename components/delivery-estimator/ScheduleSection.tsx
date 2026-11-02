"use client";
import { Icon } from "@/components/Icons";
import { dateLabel, timeLabel } from "./model";

type ScheduleSectionProps = {
  date: string;
  time: string;
  /** earliest / latest selectable day (ISO) */
  minDate: string;
  maxDate: string;
  slots: string[];
  onDate: (iso: string) => void;
  onTime: (slot: string) => void;
};

/** Pickup day and time. The native pickers sit invisibly on top of the styled cards. */
export function ScheduleSection({
  date,
  time,
  minDate,
  maxDate,
  slots,
  onDate,
  onTime,
}: ScheduleSectionProps) {
  const chosen = timeLabel(time);

  return (
    <section id="sec-time" className="scroll-mt-20 grid grid-cols-2 gap-3">
      <label className="relative bg-panel border border-line rounded-card p-3.5 flex flex-col gap-1.5 cursor-pointer">
        <span className="flex items-center gap-2 text-sm text-muted">
          <Icon name="calendar" className="w-5 h-5 text-ink" /> التاريخ
          <Icon name="chevronDown" className="w-4 h-4 mr-auto" />
        </span>
        <span className="font-bold whitespace-nowrap truncate">{dateLabel(date)}</span>
        <input
          type="date"
          min={minDate}
          max={maxDate}
          value={date}
          onChange={(e) => {
            if (e.target.value) onDate(e.target.value);
          }}
          onClick={(e) => e.currentTarget.showPicker?.()}
          aria-label="التاريخ"
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </label>
      <label className="relative bg-panel border border-line rounded-card p-3.5 flex flex-col gap-1.5 cursor-pointer">
        <span className="flex items-center gap-2 text-sm text-muted">
          <Icon name="clock" className="w-5 h-5 text-ink" /> الوقت
          <Icon name="chevronDown" className="w-4 h-4 mr-auto" />
        </span>
        <span className="font-bold whitespace-nowrap">
          <span className="text-lg">{chosen.clock}</span> {chosen.part}
        </span>
        <select
          value={time}
          onChange={(e) => onTime(e.target.value)}
          aria-label="الوقت"
          className="absolute inset-0 opacity-0 cursor-pointer"
        >
          {slots.map((t) => {
            const label = timeLabel(t);
            return (
              <option key={t} value={t}>
                {label.clock} {label.part}
              </option>
            );
          })}
        </select>
      </label>
    </section>
  );
}
