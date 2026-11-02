"use client";
import { useState } from "react";
import { Icon } from "@/components/Icons";
import { formatEgp } from "@/lib/money";

type ExtrasSectionProps = {
  loaders: number;
  maxLoaders: number;
  /** per-person loader fee (piastres) */
  loaderFee?: number;
  onLoaders: (n: number) => void;
  /** companies get their contract price — no coupons */
  showPromo: boolean;
  initialPromo: string;
  promoMessage: { ok: boolean; text: string } | null;
  onApplyPromo: (code: string) => void;
  notes: string;
  onNotes: (value: string) => void;
  disclaimer: string;
};

/** Loaders, coupon and notes for the driver. */
export function ExtrasSection(props: ExtrasSectionProps) {
  return (
    <section id="sec-details" className="scroll-mt-20 flex flex-col gap-3">
      <LoadersCounter
        value={props.loaders}
        max={props.maxLoaders}
        fee={props.loaderFee}
        onChange={props.onLoaders}
      />
      {props.showPromo && (
        <PromoField initial={props.initialPromo} message={props.promoMessage} onApply={props.onApplyPromo} />
      )}
      <label className="bg-panel border border-line rounded-card p-4 flex flex-col gap-2">
        <span className="flex items-center gap-3 font-extrabold">
          <Icon name="file" className="w-7 h-7 text-ink-2 shrink-0" /> ملاحظات للسواق
          <span className="text-sm text-muted font-normal">(اختياري)</span>
        </span>
        <textarea
          value={props.notes}
          onChange={(e) => props.onNotes(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="مثلاً: في أسانسير، اتصل قبل ما توصل بـ 10 دقايق"
          className="rounded-xl bg-panel border border-line-2 px-3.5 py-2.5 text-base outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 resize-none"
        />
      </label>
      {props.disclaimer && <p className="text-xs text-muted text-center">{props.disclaimer}</p>}
    </section>
  );
}

type LoadersCounterProps = { value: number; max: number; fee?: number; onChange: (n: number) => void };

function LoadersCounter({ value, max, fee, onChange }: LoadersCounterProps) {
  const roundButton =
    "w-10 h-10 rounded-lg border border-line-2 bg-panel text-xl font-semibold cursor-pointer hover:bg-panel-2 disabled:opacity-40";

  return (
    <div className="bg-panel border border-line rounded-card p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Icon name="user" className="w-7 h-7 text-ink-2" />
        <div>
          <div className="font-extrabold">العمالة المساعدة</div>
          <div className="text-sm text-muted">
            {fee ? `${formatEgp(fee)} لكل فرد` : "أفراد يساعدوا في التحميل"}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="زوّد"
          onClick={() => onChange(Math.min(max, value + 1))}
          className={roundButton}
        >
          +
        </button>
        <span className="w-6 text-center text-2xl font-extrabold">{value}</span>
        <button
          type="button"
          aria-label="قلّل"
          onClick={() => onChange(Math.max(0, value - 1))}
          className={roundButton}
        >
          −
        </button>
      </div>
    </div>
  );
}

type PromoFieldProps = {
  initial: string;
  message: { ok: boolean; text: string } | null;
  onApply: (code: string) => void;
};

function PromoField({ initial, message, onApply }: PromoFieldProps) {
  const [code, setCode] = useState(initial);

  return (
    <div className="bg-panel border border-line rounded-card p-4 flex flex-col gap-2">
      <span className="flex items-center gap-3 font-extrabold">
        <Icon name="ticket" className="w-7 h-7 text-ink-2 shrink-0" /> كود الخصم
      </span>
      <div className="flex items-center gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="اكتب كود الخصم هنا"
          className="flex-1 min-w-0 rounded-xl bg-panel border border-line-2 px-3.5 py-2.5 text-base outline-none focus:border-primary focus:ring-3 focus:ring-primary/15"
        />
        <button
          type="button"
          onClick={() => onApply(code.trim())}
          disabled={!code.trim()}
          className="shrink-0 rounded-xl border border-line-2 bg-panel text-ink px-4 py-2 font-semibold cursor-pointer hover:bg-panel-2 disabled:opacity-40"
        >
          تطبيق
        </button>
      </div>
      {message && (
        <span
          className={`text-sm font-bold flex items-center gap-1 ${message.ok ? "text-ok" : "text-booked"}`}
        >
          {message.ok && <Icon name="check" className="w-4 h-4" strokeWidth={3} />}
          {message.text}
        </span>
      )}
    </div>
  );
}
