"use client";
import { useState } from "react";
import { PriceBreakdown } from "@/components/ui";
import { Icon } from "@/components/Icons";
import { formatEgp } from "@/lib/money";
import type { Quote } from "@/engines/pricing";

type OrderBarProps = {
  quote: Quote | null;
  /** a new price is being fetched */
  pricing: boolean;
  ordering: boolean;
  error: string | null;
  /** keyboard is up → slide the bar away */
  hidden: boolean;
  onOrder: () => void;
};

/** Sticky bar above the bottom nav: total, price details and the order button. */
export function OrderBar({ quote, pricing, ordering, error, hidden, onOrder }: OrderBarProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div
      aria-hidden={hidden || undefined}
      className={`fixed inset-x-0 bottom-[calc(4.4rem+env(safe-area-inset-bottom))] z-30 transition-[transform,opacity] duration-200 ${
        hidden ? "translate-y-[calc(100%+5rem)] opacity-0 pointer-events-none" : ""
      }`}
    >
      <div className="max-w-lg mx-auto bg-panel border-t border-line shadow-[0_-8px_24px_rgba(16,32,28,0.08)] rounded-t-3xl">
        {detailsOpen && quote && (
          <div className="px-4 pt-4 max-h-[45vh] overflow-y-auto">
            <PriceBreakdown quote={quote} />
          </div>
        )}
        {error && (
          <div className="mx-4 mt-3 bg-booked-soft text-booked rounded-xl px-3 py-2 text-sm font-bold text-center">
            {error}
          </div>
        )}
        <div className="flex items-center gap-3 p-3">
          <button
            type="button"
            onClick={onOrder}
            disabled={ordering || !quote}
            className="tap flex-1 whitespace-nowrap rounded-2xl bg-accent text-on-accent px-3 text-lg font-extrabold flex items-center justify-center gap-2 shadow-[0_6px_16px_rgba(242,165,65,0.35)] hover:brightness-105 disabled:opacity-50"
          >
            {ordering ? "بنبعت الطلب…" : "اطلب التوصيلة"}
            <Icon name="chevronLeft" className="w-5 h-5" strokeWidth={2.6} />
          </button>
          <div className="text-center shrink-0">
            <div className={`text-2xl font-extrabold leading-none ${pricing ? "opacity-50" : ""}`}>
              {quote ? formatEgp(quote.total, { withUnit: false }) : "—"}
            </div>
            <div className="text-xs text-muted mt-1">الإجمالي (جنيه)</div>
          </div>
          <button
            type="button"
            onClick={() => setDetailsOpen((o) => !o)}
            disabled={!quote}
            aria-expanded={detailsOpen}
            className="shrink-0 text-xs font-bold text-primary flex flex-col items-center leading-tight disabled:opacity-40"
          >
            <Icon name={detailsOpen ? "chevronDown" : "chevronUp"} className="w-4 h-4" />
            تفاصيل السعر
          </button>
        </div>
      </div>
    </div>
  );
}
