"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icons";
import { DRAFT_KEY, type OrderDraft } from "@/components/delivery-estimator/model";

/** Home-page start of an order: the two addresses go to /estimate as a draft the estimator picks up. */
export function QuoteStarter() {
  const router = useRouter();
  const [pickupAddr, setPickupAddr] = useState("");
  const [dropoffAddr, setDropoffAddr] = useState("");

  function start(e: React.FormEvent) {
    e.preventDefault();
    const draft: Partial<OrderDraft> = { pickupAddr: pickupAddr.trim(), dropoffAddr: dropoffAddr.trim() };
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // storage blocked: the customer types the addresses again on the next page
    }
    router.push("/estimate");
  }

  const field = "w-full bg-transparent py-2 text-base outline-none placeholder:text-muted/80";

  return (
    <form onSubmit={start} className="bg-panel border border-line rounded-card p-2">
      <div className="relative rounded-xl border border-line-2 focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/15">
        {/* the line joining the two stops */}
        <span
          className="absolute start-[22px] top-[38px] bottom-[38px] border-s border-dashed border-line-2"
          aria-hidden
        />
        <label className="flex items-center gap-3 px-3.5 py-2">
          <span className="w-4 h-4 shrink-0 rounded-full border-[3px] border-booked bg-panel" aria-hidden />
          <span className="flex-1 min-w-0">
            <span className="block text-xs font-semibold text-muted">مكان الاستلام</span>
            <input
              className={field}
              value={pickupAddr}
              onChange={(e) => setPickupAddr(e.target.value)}
              placeholder="المنطقة، الشارع، رقم العمارة"
              autoComplete="street-address"
            />
          </span>
        </label>
        <div className="ms-11 border-t border-line" />
        <label className="flex items-center gap-3 px-3.5 py-2">
          <span className="w-4 h-4 shrink-0 rounded-[4px] bg-primary" aria-hidden />
          <span className="flex-1 min-w-0">
            <span className="block text-xs font-semibold text-muted">مكان التسليم</span>
            <input
              className={field}
              value={dropoffAddr}
              onChange={(e) => setDropoffAddr(e.target.value)}
              placeholder="المنطقة، الشارع، رقم العمارة"
            />
          </span>
        </label>
      </div>
      <button
        type="submit"
        className="tap mt-2 w-full rounded-xl bg-accent text-on-accent font-semibold text-base flex items-center justify-center gap-2 cursor-pointer hover:brightness-95"
      >
        اعرف السعر
        <Icon name="arrowLeft" className="w-5 h-5" strokeWidth={2.2} />
      </button>
    </form>
  );
}
