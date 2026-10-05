"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { rateOrderAction, type RateState } from "@/app/(customer)/bookings/actions";

/** Star rating input for a completed delivery order. */
export function RateOrder({ code }: { code: string }) {
  const [state, action] = useActionState<RateState, FormData>(rateOrderAction, { ok: false });
  const [stars, setStars] = useState(0);

  if (state.ok) {
    return <div className="bg-ok-soft text-ok rounded-xl px-3 py-2 text-sm font-bold text-center">شكراً لتقييمك! ⭐</div>;
  }

  return (
    <form action={action} className="bg-panel-2 rounded-2xl p-3 flex flex-col gap-2">
      <div className="font-bold text-sm">قيّم التوصيلة</div>
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="rating" value={stars} />
      <div className="flex gap-1 justify-center" dir="ltr">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setStars(n)}
            className={`text-3xl tap leading-none ${n <= stars ? "" : "grayscale opacity-40"}`}
            aria-label={`${n} نجوم`}
          >
            ⭐
          </button>
        ))}
      </div>
      <input
        name="comment"
        placeholder="رأيك (اختياري)"
        className="rounded-xl border border-line-2 bg-panel px-3 py-2 text-sm"
      />
      {state.error && <div className="text-booked text-xs font-bold text-center">{state.error}</div>}
      <SubmitBtn disabled={stars === 0} />
    </form>
  );
}

function SubmitBtn({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="rounded-xl bg-primary text-white py-2.5 font-bold tap disabled:opacity-40"
    >
      {pending ? "…" : "ابعت التقييم"}
    </button>
  );
}
