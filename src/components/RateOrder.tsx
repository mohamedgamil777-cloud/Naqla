"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { rateOrderAction, type RateState } from "@/app/(customer)/bookings/actions";
import { Icon } from "@/components/Icons";

/** Star rating input for a completed delivery order. */
export function RateOrder({ code }: { code: string }) {
  const [state, action] = useActionState<RateState, FormData>(rateOrderAction, { ok: false });
  const [stars, setStars] = useState(0);

  if (state.ok) {
    return (
      <div className="bg-ok-soft text-ok rounded-xl px-3 py-2.5 text-sm font-bold flex items-center justify-center gap-1.5">
        <Icon name="checkCircle" className="w-5 h-5" /> شكراً لتقييمك!
      </div>
    );
  }

  return (
    <form action={action} className="bg-panel-2 rounded-2xl p-3 flex flex-col gap-2.5">
      <div className="font-bold text-sm text-center">إيه رأيك في التوصيلة؟</div>
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="rating" value={stars} />
      <div className="flex gap-1.5 justify-center" dir="ltr">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setStars(n)} className="p-0.5" aria-label={`${n} نجوم`} aria-pressed={n <= stars}>
            <Icon name="star" className={`w-8 h-8 ${n <= stars ? "text-accent fill-current" : "text-line-2"}`} />
          </button>
        ))}
      </div>
      <input name="comment" placeholder="اكتب رأيك (اختياري)" className="rounded-xl border border-line bg-panel px-3 py-2.5 text-sm outline-none focus:border-primary" />
      {state.error && <div className="text-booked text-xs font-bold text-center">{state.error}</div>}
      <SubmitBtn disabled={stars === 0} />
    </form>
  );
}

function SubmitBtn({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className="tap rounded-xl bg-primary text-white font-bold disabled:opacity-40">
      {pending ? "…" : "ابعت التقييم"}
    </button>
  );
}
