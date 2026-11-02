"use client";
import Link from "next/link";
import { Button, PriceBreakdown, inputClass } from "@/components/ui";
import { durationLabel, fullDateLabel, hourLabel } from "@/lib/client-time";
import type { Quote } from "@/engines/pricing";
import type { VehicleListItem } from "@/types";
import { Row, StepCard, type Alt, type Place } from "./parts";

type ReviewStepProps = {
  vehicle?: VehicleListItem;
  dateISO: string | null;
  startHour: number | null;
  hours: number | null;
  place: Place;
  withDriver: boolean;
  loaders: number;
  quote: Quote | null;
  loading: boolean;
  promo: string;
  onPromo: (code: string) => void;
  onApplyPromo: () => void;
  name: string;
  onName: (name: string) => void;
  authed: boolean;
  signIn: {
    phone: string;
    password: string;
    onPhone: (v: string) => void;
    onPassword: (v: string) => void;
    onSubmit: () => void;
  };
  /** nearest free start times after a conflict */
  alternatives: Alt[] | null;
  onAlternative: (alt: Alt) => void;
  onConfirm: () => void;
  onBack: () => void;
};

export function ReviewStep(props: ReviewStepProps) {
  const { vehicle, quote } = props;
  const loadersText =
    props.loaders === 0 ? "بدون" : `${props.loaders} ${props.loaders === 1 ? "فرد" : "أفراد"}`;

  return (
    <StepCard title="مراجعة الحجز" onBack={props.onBack}>
      {props.loading && !quote && <p className="text-muted text-center py-6">بنحسب السعر…</p>}
      {quote && (
        <div className="flex flex-col gap-4">
          <div className="bg-panel-2 rounded-2xl p-4 text-[15px] flex flex-col gap-1.5">
            <Row k="العربية" v={vehicle?.name ?? ""} />
            <Row k="اليوم" v={props.dateISO ? fullDateLabel(props.dateISO) : ""} />
            <Row k="الوقت" v={props.startHour != null ? hourLabel(props.startHour) : ""} />
            <Row k="المدة" v={props.hours ? durationLabel(props.hours) : ""} />
            <Row k="الاستلام" v={props.place === "branch" ? `من ${vehicle?.branchName}` : "توصيل لعندك"} />
            <Row k="السائق" v={props.withDriver ? "مع سائق" : "بدون سائق"} />
            <Row k="العمالة" v={loadersText} />
          </div>

          <div className="flex gap-2">
            <input
              className={inputClass}
              placeholder="كود خصم (اختياري)"
              value={props.promo}
              onChange={(e) => props.onPromo(e.target.value)}
            />
            <Button variant="secondary" onClick={props.onApplyPromo} className="!px-4">
              تطبيق
            </Button>
          </div>

          <PriceBreakdown quote={quote} />

          <div className="flex flex-col gap-3 border-t border-line pt-4">
            <input
              className={inputClass}
              placeholder="اسمك"
              value={props.name}
              onChange={(e) => props.onName(e.target.value)}
            />
            {!props.authed && <InlineSignIn {...props.signIn} />}
          </div>

          {props.alternatives && props.alternatives.length > 0 && (
            <Alternatives list={props.alternatives} onPick={props.onAlternative} />
          )}

          <Button
            variant="accent"
            full
            disabled={props.loading || !props.authed || !props.name.trim()}
            onClick={props.onConfirm}
          >
            {props.loading ? "لحظة…" : "تأكيد الحجز"}
          </Button>
          {!props.authed && (
            <p className="text-center text-sm text-muted">أكّد رقم موبايلك عشان تكمل الحجز</p>
          )}
        </div>
      )}
    </StepCard>
  );
}

type InlineSignInProps = ReviewStepProps["signIn"];

/** Phone + password sign-in right inside the booking (new customers create an account on /login). */
function InlineSignIn({ phone, password, onPhone, onPassword, onSubmit }: InlineSignInProps) {
  const here = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/book";

  return (
    <>
      <input
        className={inputClass}
        inputMode="tel"
        placeholder="رقم الموبايل"
        dir="ltr"
        autoComplete="username"
        value={phone}
        onChange={(e) => onPhone(e.target.value)}
      />
      <div className="flex gap-2">
        <input
          className={inputClass}
          type="password"
          placeholder="كلمة السر"
          dir="ltr"
          autoComplete="current-password"
          value={password}
          onChange={(e) => onPassword(e.target.value)}
        />
        <Button variant="secondary" onClick={onSubmit} className="!px-4 whitespace-nowrap">
          دخول
        </Button>
      </div>
      <p className="text-sm text-muted">
        معندكش حساب؟{" "}
        <Link href={`/login?next=${encodeURIComponent(here)}`} className="text-primary font-bold">
          اعمل حساب جديد
        </Link>
      </p>
    </>
  );
}

function Alternatives({ list, onPick }: { list: Alt[]; onPick: (alt: Alt) => void }) {
  return (
    <div className="bg-accent-soft rounded-2xl p-3">
      <p className="font-bold mb-2">أقرب مواعيد متاحة:</p>
      <div className="flex flex-col gap-2">
        {list.map((a) => (
          <button
            key={a.startISO}
            type="button"
            onClick={() => onPick(a)}
            className="tap bg-panel border-2 border-line-2 rounded-xl py-2.5 font-semibold hover:border-primary"
          >
            {a.startLabel}
          </button>
        ))}
      </div>
    </div>
  );
}
