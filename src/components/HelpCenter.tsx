"use client";
import { useState } from "react";
import type { FaqItem, FaqTopic } from "@/data/content";
import { Icon, type IconName } from "@/components/Icons";

const TOPICS: { id: FaqTopic; label: string; icon: IconName }[] = [
  { id: "order", label: "الطلب", icon: "file" },
  { id: "price", label: "السعر", icon: "coins" },
  { id: "driver", label: "السواق", icon: "user" },
  { id: "payment", label: "الدفع", icon: "card" },
  { id: "cancel", label: "الإلغاء", icon: "xCircle" },
];
const TOPIC_ICON: Record<FaqTopic, IconName> = { order: "truck", price: "coins", driver: "user", payment: "card", cancel: "xCircle" };

export function HelpCenter({
  phoneHref,
  phoneLabel,
  whatsapp,
  faqs,
}: {
  phoneHref: string;
  phoneLabel: string;
  whatsapp: string;
  faqs: FaqItem[]; // placeholders already filled
}) {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<FaqTopic | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const q = query.trim();
  const shown = faqs.filter((f) => (!topic || f.topic === topic) && (!q || f.q.includes(q) || f.a.includes(q)));

  return (
    <div className="p-4 flex flex-col gap-5">
      <header className="text-center pt-2">
        <h1 className="text-[1.9rem] font-extrabold leading-tight">محتاج مساعدة؟</h1>
        <p className="text-muted mt-1">إحنا معاك خطوة بخطوة</p>
      </header>

      {/* Contact */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-panel border border-line rounded-card shadow-sm p-3 flex flex-col items-center text-center gap-1.5">
          <span className="w-14 h-14 rounded-full bg-primary-soft text-primary grid place-items-center">
            <Icon name="whatsapp" className="w-7 h-7" />
          </span>
          <span className="font-extrabold leading-snug">تواصل معانا على واتساب</span>
          <span className="text-xs text-muted">أسرع وسيلة للمساعدة</span>
          {whatsapp ? (
          <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="tap mt-auto w-full rounded-xl bg-accent text-on-accent font-extrabold flex items-center justify-center gap-1.5 text-sm px-2"
            >
              <Icon name="whatsapp" className="w-5 h-5" /> ابعتلنا
            </a>
          ) : (
            <span className="mt-auto w-full rounded-xl bg-panel-2 text-muted text-sm font-bold py-3">الرقم هيتضاف قريباً</span>
          )}
        </div>
        <div className="bg-panel border border-line rounded-card shadow-sm p-3 flex flex-col items-center text-center gap-1.5">
          <span className="w-14 h-14 rounded-full bg-primary-soft text-primary grid place-items-center">
            <Icon name="phone" className="w-7 h-7" />
          </span>
          <span className="font-extrabold leading-snug">اتصل بينا</span>
          <span className="text-xs text-muted">فريق خدمة العملاء</span>
          {phoneLabel ? (
          <a
              href={phoneHref}
              className="tap mt-auto w-full rounded-xl border-2 border-primary text-emph font-extrabold flex items-center justify-center gap-1.5 hover:bg-primary-soft"
            >
              <Icon name="phone" className="w-5 h-5 text-primary" />
              <span dir="ltr">{phoneLabel}</span>
            </a>
          ) : (
            <span className="mt-auto w-full rounded-xl bg-panel-2 text-muted text-sm font-bold py-3">الرقم هيتضاف قريباً</span>
          )}
        </div>
      </div>

      {/* Search */}
      <label className="flex items-center gap-3 bg-panel border border-line rounded-2xl px-4 py-3.5 shadow-sm focus-within:border-primary">
        <Icon name="search" className="w-5 h-5 text-ink-2 shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="دوّر على سؤالك …"
          className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-muted"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="امسح البحث" className="text-muted">
            <Icon name="xCircle" className="w-5 h-5" />
          </button>
        )}
      </label>

      {/* Topics */}
      <section>
        <h2 className="text-lg font-extrabold mb-2.5">اختار موضوع</h2>
        <div className="grid grid-cols-5 gap-2">
          {TOPICS.map((t) => {
            const on = topic === t.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={on}
                onClick={() => setTopic(on ? null : t.id)}
                className={`rounded-2xl border-2 py-3 flex flex-col items-center gap-1.5 ${
                  on ? "border-primary bg-primary-soft" : "border-transparent bg-panel shadow-sm"
                }`}
              >
                <Icon name={t.icon} className="w-6 h-6 text-primary" />
                <span className="text-sm font-bold">{t.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* FAQs */}
      <section>
        <h2 className="text-lg font-extrabold mb-2.5">الأسئلة الشائعة</h2>
        {shown.length === 0 ? (
          <div className="bg-panel border border-line rounded-2xl p-5 text-center text-muted">
            مش لاقيين سؤالك؟ ابعتلنا على واتساب وهنرد عليك.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {shown.map((f) => {
              const isOpen = open === f.id;
              return (
                <div key={f.id} className="bg-panel rounded-2xl shadow-sm border border-line overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : f.id)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center gap-3 p-3 text-right"
                  >
                    <span className="w-10 h-10 shrink-0 rounded-full bg-primary-soft text-primary grid place-items-center">
                      <Icon name={TOPIC_ICON[f.topic] ?? "help"} className="w-5 h-5" />
                    </span>
                    <span className="flex-1 font-bold">{f.q}</span>
                    <Icon name={isOpen ? "chevronUp" : "chevronDown"} className="w-5 h-5 text-ink-2 shrink-0" />
                  </button>
                  {isOpen && <p className="px-4 pb-4 pr-[4.25rem] text-ink-2 leading-relaxed">{f.a}</p>}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
