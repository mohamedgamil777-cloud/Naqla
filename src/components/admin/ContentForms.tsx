"use client";
import { useActionState, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import {
  saveContactAction,
  saveHomeAction,
  saveOrderContentAction,
  saveFaqAction,
  deleteFaqAction,
  moveFaqAction,
  type ContentState,
} from "@/app/admin/content/actions";
import { ImageField } from "@/components/admin/ImageField";
import { FAQ_TOPICS, type AppContent, type FaqItem } from "@/data/content";
import { piastresToEgp } from "@/lib/money";

const inp = "w-full rounded-xl border border-line-2 bg-panel px-3 py-2.5 outline-none focus:border-primary";
const lbl = "text-sm font-bold text-ink-2";

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="bg-panel border border-line rounded-card p-4 md:p-5 flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-extrabold">{title}</h2>
        {hint && <p className="text-sm text-muted mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Status({ state }: { state: ContentState }) {
  if (state.error) return <div className="bg-booked-soft text-booked rounded-xl px-3 py-2 text-sm font-bold">{state.error}</div>;
  if (state.ok) return <div className="bg-ok-soft text-ok rounded-xl px-3 py-2 text-sm font-bold">تم الحفظ — التغيير ظهر في التطبيق ✅</div>;
  return null;
}

function SaveBtn({ label = "حفظ" }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="self-start rounded-xl bg-primary text-white px-6 py-2.5 font-bold disabled:opacity-50">
      {pending ? "بيحفظ…" : label}
    </button>
  );
}

/* ---------- 1) contact ---------- */
function ContactForm({ c }: { c: AppContent }) {
  const [state, action] = useActionState<ContentState, FormData>(saveContactAction, { ok: false });
  return (
    <Section title="أرقام التواصل" hint="بتظهر للعميل في المساعدة وحسابي وصفحات الطلب.">
      <form action={action} className="flex flex-col gap-3">
        <Status state={state} />
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className={lbl}>رقم خدمة العملاء (اتصل بينا)</span>
            <input className={inp} name="supportPhone" defaultValue={c.supportPhone} placeholder="16xxx أو 01xxxxxxxxx" dir="ltr" />
          </label>
          <label className="flex flex-col gap-1">
            <span className={lbl}>رقم واتساب</span>
            <input className={inp} name="whatsapp" defaultValue={c.whatsapp} placeholder="01xxxxxxxxx" dir="ltr" />
          </label>
        </div>
        <SaveBtn />
      </form>
    </Section>
  );
}

/* ---------- 2) home ---------- */
function HomeForm({ c }: { c: AppContent }) {
  const [state, action] = useActionState<ContentState, FormData>(saveHomeAction, { ok: false });
  return (
    <Section title="الصفحة الرئيسية" hint="النصوص والصورة اللي العميل بيشوفها أول ما يفتح التطبيق.">
      <form action={action} className="flex flex-col gap-3">
        <Status state={state} />
        <label className="flex flex-col gap-1">
          <span className={lbl}>العنوان الكبير</span>
          <input className={inp} name="title" defaultValue={c.home.title} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={lbl}>الجملة تحت العنوان (كل سطر في سطر لوحده)</span>
          <textarea className={`${inp} resize-none`} rows={2} name="subtitle" defaultValue={c.home.subtitle} />
        </label>
        <ImageField
          name="heroImage"
          label="صورة الرئيسية (لو مفيش صورة بيظهر الرسم الافتراضي — الأفضل صورة عرضها أكبر من طولها)"
          defaultValue={c.home.heroImage}
          camera={false}
          maxWidth={1600}
          wide
        />
        <div>
          <span className={lbl}>المميزات (3 كروت)</span>
          <div className="grid sm:grid-cols-3 gap-2 mt-1">
            {c.home.trust.map((t, i) => (
              <input key={i} className={inp} name={`trust${i}`} defaultValue={t} />
            ))}
          </div>
        </div>
        <div>
          <span className={lbl}>بتشتغل إزاي؟ (4 خطوات)</span>
          <div className="grid sm:grid-cols-4 gap-2 mt-1">
            {c.home.steps.map((t, i) => (
              <input key={i} className={inp} name={`step${i}`} defaultValue={t} />
            ))}
          </div>
        </div>
        <SaveBtn />
      </form>
    </Section>
  );
}

/* ---------- 3) order screen ---------- */
const ICON_LABEL: Record<string, string> = { file: "ورق", box: "صندوق", sofa: "كنبة", home: "بيت", truck: "عربية" };

function OrderForm({ c, sizeCodes }: { c: AppContent; sizeCodes: { code: string; name: string }[] }) {
  const [state, action] = useActionState<ContentState, FormData>(saveOrderContentAction, { ok: false });
  const rows = [...c.order.cargo, ...Array.from({ length: Math.max(0, 6 - c.order.cargo.length) }, () => null)];
  return (
    <Section title="شاشة الطلب" hint="العمالة وخيارات «ماذا ستنقل؟». مواعيد الشغل وأقصى أيام للحجز من «الإعدادات».">
      <form action={action} className="flex flex-col gap-3">
        <Status state={state} />
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className={lbl}>أجر العامل الواحد (جنيه) — بيدخل في حساب السعر</span>
            <input className={inp} name="loaderFee" type="number" min="0" step="1" defaultValue={piastresToEgp(c.order.loaderFee)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={lbl}>أقصى عدد عمالة في الطلب</span>
            <input className={inp} name="maxLoaders" type="number" min="0" max="10" defaultValue={c.order.maxLoaders} />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className={lbl}>ملاحظة تحت السعر</span>
          <input className={inp} name="disclaimer" defaultValue={c.order.disclaimer} />
        </label>
        <div>
          <span className={lbl}>«ماذا ستنقل؟» — الاختيار والحجم اللي بيترشّح (لحد 6، سيب الاسم فاضي للحذف)</span>
          <div className="flex flex-col gap-2 mt-1">
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-2">
                <input className={inp} name={`cargoLabel${i}`} defaultValue={r?.label ?? ""} placeholder="مثلاً: ثلاجة / غسالة" />
                <select className={inp} name={`cargoSize${i}`} defaultValue={r?.size ?? sizeCodes[0]?.code}>
                  {sizeCodes.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
                <select className={inp} name={`cargoIcon${i}`} defaultValue={r?.icon ?? "box"}>
                  {Object.entries(ICON_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
        <SaveBtn />
      </form>
    </Section>
  );
}

/* ---------- 4) FAQs ---------- */
function FaqEditor({ f, onDone }: { f?: FaqItem; onDone?: () => void }) {
  const [state, action] = useActionState<ContentState, FormData>(async (p, fd) => {
    const r = await saveFaqAction(p, fd);
    if (r.ok) onDone?.();
    return r;
  }, { ok: false });
  return (
    <form action={action} className="flex flex-col gap-2 bg-ground/60 rounded-xl p-3">
      <Status state={state} />
      {f && <input type="hidden" name="id" value={f.id} />}
      <div className="grid sm:grid-cols-[auto_1fr] gap-2">
        <select className={inp} name="topic" defaultValue={f?.topic ?? "order"}>
          {FAQ_TOPICS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <input className={inp} name="q" defaultValue={f?.q} placeholder="السؤال" />
      </div>
      <textarea className={`${inp} resize-y`} rows={3} name="a" defaultValue={f?.a} placeholder="الإجابة" />
      <SaveBtn label={f ? "حفظ التعديل" : "إضافة السؤال"} />
    </form>
  );
}

function FaqList({ c }: { c: AppContent }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const topicLabel = Object.fromEntries(FAQ_TOPICS.map((t) => [t.id, t.label]));
  return (
    <Section
      title={`الأسئلة الشائعة (${c.faqs.length})`}
      hint="تقدر تكتب {ساعات_الإلغاء} أو {أجر_العامل} في الإجابة وهتتملي تلقائي من الإعدادات."
    >
      <div className="flex flex-col gap-2">
        {c.faqs.map((f, i) => (
          <div key={f.id} className="border border-line rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <span className="rounded-full bg-primary-soft text-primary-ink text-xs font-bold px-2 py-0.5 shrink-0">{topicLabel[f.topic]}</span>
              <span className="font-bold flex-1">{f.q}</span>
              <div className="flex items-center gap-1 shrink-0">
                <form action={moveFaqAction}>
                  <input type="hidden" name="id" value={f.id} />
                  <button name="dir" value="up" disabled={i === 0} className="w-8 h-8 rounded-lg hover:bg-panel-2 disabled:opacity-30" aria-label="لفوق">↑</button>
                  <button name="dir" value="down" disabled={i === c.faqs.length - 1} className="w-8 h-8 rounded-lg hover:bg-panel-2 disabled:opacity-30" aria-label="لتحت">↓</button>
                </form>
                <button type="button" onClick={() => setEditing(editing === f.id ? null : f.id)} className="px-2 h-8 rounded-lg text-primary font-bold hover:bg-primary-soft">
                  {editing === f.id ? "إغلاق" : "تعديل"}
                </button>
                <form action={deleteFaqAction} onSubmit={(e) => { if (!confirm("تمسح السؤال ده؟")) e.preventDefault(); }}>
                  <input type="hidden" name="id" value={f.id} />
                  <button className="px-2 h-8 rounded-lg text-booked font-bold hover:bg-booked-soft">حذف</button>
                </form>
              </div>
            </div>
            {editing === f.id ? <FaqEditor f={f} onDone={() => setEditing(null)} /> : <p className="text-sm text-muted line-clamp-2">{f.a}</p>}
          </div>
        ))}
      </div>
      {adding ? (
        <FaqEditor onDone={() => setAdding(false)} />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="self-start rounded-xl border-2 border-primary text-primary px-5 py-2 font-bold hover:bg-primary-soft">
          + إضافة سؤال
        </button>
      )}
    </Section>
  );
}

export function ContentForms({ content, sizeCodes }: { content: AppContent; sizeCodes: { code: string; name: string }[] }) {
  return (
    <div className="flex flex-col gap-5">
      <ContactForm c={content} />
      <OrderForm c={content} sizeCodes={sizeCodes} />
      <HomeForm c={content} />
      <FaqList c={content} />
    </div>
  );
}
