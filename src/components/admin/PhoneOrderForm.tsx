"use client";
import { startTransition, useActionState, useEffect, useState } from "react";
import { createPhoneOrder, quotePhoneOrder, type PhoneOrderState } from "@/app/admin/new-order/actions";
import { PriceBreakdown } from "@/components/ui";
import type { DeliveryEstimate } from "@/services/delivery-service";

const inp = "w-full rounded-xl border border-line-2 bg-panel px-3 py-2.5 text-base outline-none focus:border-primary";
const lbl = "block text-sm font-bold text-ink-2 mb-1.5";

type Size = { id: string; name: string; sizeCode: string; capacityKg: number | null };
type Company = { id: string; name: string; billing: "cash" | "monthly" };

export function PhoneOrderForm({
  sizes, companies, cargo, maxLoaders, minDate, maxDate, times,
}: {
  sizes: Size[];
  companies: Company[];
  cargo: string[];
  maxLoaders: number;
  minDate: string;
  maxDate: string;
  times: string[];
}) {
  const [state, action, pending] = useActionState<PhoneOrderState, FormData>(createPhoneOrder, { ok: false });

  const [categoryId, setCategoryId] = useState("");
  const [km, setKm] = useState("");
  const [loaders, setLoaders] = useState(0);
  const [promo, setPromo] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [est, setEst] = useState<DeliveryEstimate | null>(null);

  // Live price (debounced) from the same server pricing the customer site uses.
  useEffect(() => {
    const n = Number(km);
    if (!categoryId || !(n > 0)) {
      setEst(null);
      return;
    }
    const t = setTimeout(async () => {
      setEst(await quotePhoneOrder({ categoryId, km: n, loaders, promoCode: promo.trim(), companyId }));
    }, 350);
    return () => clearTimeout(t);
  }, [categoryId, km, loaders, promo, companyId]);

  if (state.ok && state.code) {
    return (
      <div className="bg-ok-soft border border-ok rounded-card p-6 flex flex-col gap-3">
        <div className="text-xl font-extrabold text-ok">تم تسجيل الطلب #{state.code}</div>
        <p>الطلب «مؤكد». الخطوة الجاية: عيّن سواق من صفحة طلبات التوصيل.</p>
        <div className="flex flex-wrap gap-2">
          <a href="/admin/orders" className="rounded-xl bg-primary text-white px-4 py-2 font-bold tap">اذهب لطلبات التوصيل</a>
          <a href="/admin/new-order" className="rounded-xl border-2 border-line-2 text-primary px-4 py-2 font-bold tap">طلب جديد</a>
        </div>
      </div>
    );
  }

  const company = companies.find((c) => c.id === companyId);

  return (
    // Submit by hand: a <form action> resets every field after the call, so an error (wrong time,
    // bad phone) would wipe what the agent typed while the customer is still on the line.
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="flex flex-col gap-5"
    >
      <Card title="العميل">
        <div className="grid sm:grid-cols-2 gap-3">
          <label><span className={lbl}>اسم العميل</span><input className={inp} name="contactName" required /></label>
          <label><span className={lbl}>موبايل العميل</span><input className={inp} name="contactPhone" inputMode="tel" dir="ltr" placeholder="01xxxxxxxxx" required /></label>
        </div>
        {companies.length > 0 && (
          <label>
            <span className={lbl}>شركة (لو الطلب لحساب شركة)</span>
            <select className={inp} name="companyId" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              <option value="">— عميل فرد —</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.billing === "monthly" ? " · حساب شهري" : ""}</option>
              ))}
            </select>
            {company && <span className="text-xs text-muted block mt-1">بيتطبّق سعر الشركة{company.billing === "monthly" ? "، والطلب بيتسجّل على حسابها الشهري" : ""}. الكوبونات مش بتشتغل مع الشركات.</span>}
          </label>
        )}
      </Card>

      <Card title="المشوار">
        <div className="grid sm:grid-cols-2 gap-3">
          <label><span className={lbl}>عنوان الاستلام</span><input className={inp} name="pickupAddress" required minLength={3} /></label>
          <label><span className={lbl}>تفاصيل الاستلام (الدور، علامة مميزة)</span><input className={inp} name="pickupDetails" /></label>
          <label><span className={lbl}>عنوان التسليم</span><input className={inp} name="dropoffAddress" required minLength={3} /></label>
          <label><span className={lbl}>تفاصيل التسليم</span><input className={inp} name="dropoffDetails" /></label>
        </div>
        <label>
          <span className={lbl}>المسافة (كم)</span>
          <input className={inp} name="km" type="number" min="0.1" step="0.1" value={km} onChange={(e) => setKm(e.target.value)} required />
          <span className="text-xs text-muted block mt-1">
            مش عارف المسافة؟ قيسها على الخريطة من <a href="/estimate" target="_blank" rel="noopener noreferrer" className="text-primary font-bold underline">صفحة حساب السعر</a> وانقل الرقم هنا.
          </span>
        </label>
      </Card>

      <Card title="العربية والحمولة">
        <div className="grid sm:grid-cols-2 gap-3">
          <label>
            <span className={lbl}>حجم العربية</span>
            <select className={inp} name="categoryId" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              <option value="">— اختار —</option>
              {sizes.map((s) => (
                <option key={s.id} value={s.id}>{s.name} · {s.sizeCode}{s.capacityKg ? ` · حتى ${s.capacityKg} كجم` : ""}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={lbl}>نوع الحمولة</span>
            <select className={inp} name="cargoType" defaultValue="">
              <option value="">— مش محدد —</option>
              {cargo.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label>
            <span className={lbl}>عدد الشيّالين</span>
            <select className={inp} name="loaders" value={loaders} onChange={(e) => setLoaders(Number(e.target.value))}>
              {Array.from({ length: maxLoaders + 1 }, (_, i) => <option key={i} value={i}>{i === 0 ? "من غير" : i}</option>)}
            </select>
          </label>
          {!company && (
            <label><span className={lbl}>كود خصم (اختياري)</span><input className={inp} name="promoCode" value={promo} onChange={(e) => setPromo(e.target.value)} /></label>
          )}
        </div>
        <label><span className={lbl}>ملاحظات للسواق</span><textarea className={inp} name="notes" rows={2} /></label>
      </Card>

      <Card title="الميعاد">
        <div className="grid sm:grid-cols-2 gap-3">
          <label><span className={lbl}>اليوم</span><input className={inp} name="date" type="date" min={minDate} max={maxDate} defaultValue={minDate} required /></label>
          <label>
            <span className={lbl}>الساعة</span>
            <select className={inp} name="time" defaultValue="" required>
              <option value="">— اختار —</option>
              {times.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>
      </Card>

      <Card title="السعر">
        {est ? (
          <>
            <PriceBreakdown quote={est.quote} />
            {est.promoError && <span className="text-sm font-bold text-booked">كود الخصم مش صالح — الطلب هيتسجّل من غير خصم.</span>}
            <span className="text-sm text-muted">قول السعر للعميل وخد موافقته قبل التسجيل. الدفع كاش للسواق{company?.billing === "monthly" ? " (أو على حساب الشركة)" : ""}.</span>
          </>
        ) : (
          <p className="text-muted">اختار الحجم واكتب المسافة عشان يظهر السعر.</p>
        )}
      </Card>

      {state.error && <div className="bg-booked-soft text-booked rounded-xl px-4 py-3 font-bold">{state.error}</div>}
      <button disabled={pending} className="rounded-2xl bg-accent text-on-accent px-6 py-3.5 text-lg font-extrabold tap disabled:opacity-60">
        {pending ? "جاري التسجيل…" : "سجّل الطلب"}
      </button>
    </form>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-panel border border-line rounded-card p-4 flex flex-col gap-3">
      <h2 className="font-extrabold">{title}</h2>
      {children}
    </div>
  );
}
