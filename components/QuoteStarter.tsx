"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icons";
import { DRAFT_KEY, type OrderDraft } from "@/components/delivery-estimator/model";

/** Home-page start of an order: the two addresses go to /estimate as a draft the estimator picks up.
 *  Phone: stacked fields. Tablet and up: one row — pickup · swap · drop-off · price button. */
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

  function swap() {
    setPickupAddr(dropoffAddr);
    setDropoffAddr(pickupAddr);
  }

  const input =
    "w-full rounded-xl border border-line-2 bg-panel px-4 py-3 text-base outline-none placeholder:text-muted/80 focus:border-primary focus:ring-3 focus:ring-primary/15";

  return (
    <form
      onSubmit={start}
      className="bg-panel rounded-2xl shadow-[0_12px_36px_rgba(16,32,28,0.10)] border border-line/70 p-4 md:p-5 flex flex-col md:flex-row md:items-end gap-3 md:gap-4"
    >
      <label className="flex-1 min-w-0">
        <span className="flex items-center gap-1.5 mb-1.5 text-sm font-bold">
          <Icon name="mapPin" className="w-5 h-5 text-booked" strokeWidth={2.2} />
          مكان الاستلام
        </span>
        <input
          className={input}
          value={pickupAddr}
          onChange={(e) => setPickupAddr(e.target.value)}
          placeholder="المنطقة، الشارع، رقم العمارة"
          autoComplete="street-address"
        />
      </label>

      <button
        type="button"
        onClick={swap}
        aria-label="بدّل مكان الاستلام والتسليم"
        className="self-center md:self-end md:mb-1 w-11 h-11 shrink-0 grid place-items-center rounded-full bg-primary-soft text-primary hover:bg-primary hover:text-white cursor-pointer -my-1 md:my-0"
      >
        <Icon name="swapH" className="w-5 h-5 rotate-90 md:rotate-0" strokeWidth={2.2} />
      </button>

      <label className="flex-1 min-w-0">
        <span className="flex items-center gap-1.5 mb-1.5 text-sm font-bold">
          <Icon name="mapPin" className="w-5 h-5 text-primary" strokeWidth={2.2} />
          مكان التسليم
        </span>
        <input
          className={input}
          value={dropoffAddr}
          onChange={(e) => setDropoffAddr(e.target.value)}
          placeholder="المنطقة، الشارع، رقم العمارة"
        />
      </label>

      <button
        type="submit"
        className="tap mt-1 md:mt-0 md:w-56 shrink-0 rounded-xl bg-accent text-on-accent font-extrabold text-lg flex items-center justify-center gap-2 cursor-pointer shadow-[0_6px_16px_rgba(242,165,65,0.35)] hover:brightness-95"
      >
        اعرف السعر
        <Icon name="arrowLeft" className="w-5 h-5" strokeWidth={2.4} />
      </button>
    </form>
  );
}
