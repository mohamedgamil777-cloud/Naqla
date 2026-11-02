"use client";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { STEPS, type AccountInfo } from "./model";

/** Ordering for a company (B2B): whose name, which price, how it's paid. */
export function CompanyBanner({ company }: { company: NonNullable<AccountInfo["company"]> }) {
  const price = company.discountPct > 0 ? `سعر خاص للشركة (خصم ${company.discountPct}%)` : "سعر الشركة";
  const payment =
    company.billing === "monthly" ? "الدفع على حساب الشركة (كشف حساب شهري)" : "الدفع عند التوصيل";

  return (
    <div className="bg-primary-soft border border-primary/20 rounded-card px-4 py-3 flex items-start gap-3">
      <span
        className="w-10 h-10 shrink-0 rounded-full bg-panel text-primary grid place-items-center text-xl"
        aria-hidden
      >
        🏢
      </span>
      <div className="text-sm">
        <div className="font-extrabold text-base">بتطلب باسم: {company.name}</div>
        <div className="text-ink-2">
          {price} · {payment}
        </div>
      </div>
    </div>
  );
}

type StepperProps = {
  /** which sections are complete */
  done: boolean[];
  onGo: (sectionId: string) => void;
};

/** Progress across the four sections; the first unfinished one is the current step. */
export function Stepper({ done, onGo }: StepperProps) {
  const current = done.findIndex((d) => !d);

  return (
    <ol className="grid grid-cols-4 relative mb-1">
      <span className="absolute top-[18px] right-[12.5%] left-[12.5%] h-0.5 bg-line-2" aria-hidden />
      {STEPS.map((s, i) => {
        const isDone = done[i] && i !== current;
        const isCurrent = i === current;
        const circle = isCurrent
          ? "bg-primary border-primary text-white"
          : isDone
            ? "bg-primary-soft border-primary text-primary"
            : "bg-panel-2 border-line-2 text-muted";
        return (
          <li key={s.id} className="relative flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={() => onGo(s.id)}
              aria-current={isCurrent ? "step" : undefined}
              className={`w-9 h-9 rounded-full grid place-items-center font-extrabold border-2 ${circle}`}
            >
              {isDone ? <Icon name="check" className="w-4 h-4" strokeWidth={3} /> : i + 1}
            </button>
            <span
              className={`text-sm ${isCurrent ? "text-primary font-extrabold" : "text-muted font-semibold"}`}
            >
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Shown once the order is placed. */
export function OrderPlaced({ code }: { code: string }) {
  return (
    <div className="bg-panel border border-line rounded-card p-8 text-center flex flex-col items-center gap-3 shadow-sm">
      <div className="w-16 h-16 rounded-full bg-ok-soft text-ok grid place-items-center">
        <Icon name="check" className="w-9 h-9" strokeWidth={2.6} />
      </div>
      <h2 className="text-2xl font-extrabold">تم استلام طلبك!</h2>
      <p className="text-ink-2 font-semibold">
        رقم الطلب: <span dir="ltr">#{code}</span>
      </p>
      <p className="text-muted">هنتواصل معاك على موبايلك لتأكيد الميعاد والسواق.</p>
      <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
        <Link
          href="/bookings"
          className="tap rounded-2xl bg-primary text-white px-6 py-3 font-bold grid place-items-center"
        >
          تابع طلبك
        </Link>
        <Link
          href="/"
          className="tap rounded-2xl border-2 border-line-2 text-ink px-6 py-3 font-bold grid place-items-center"
        >
          تمام
        </Link>
      </div>
    </div>
  );
}
