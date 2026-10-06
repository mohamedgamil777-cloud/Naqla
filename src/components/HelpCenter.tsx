"use client";
import { useMemo, useState } from "react";
import { Icon, type IconName } from "@/components/Icons";

type Topic = "order" | "price" | "driver" | "payment" | "cancel";

const TOPICS: { id: Topic; label: string; icon: IconName }[] = [
  { id: "order", label: "الطلب", icon: "file" },
  { id: "price", label: "السعر", icon: "coins" },
  { id: "driver", label: "السواق", icon: "user" },
  { id: "payment", label: "الدفع", icon: "card" },
  { id: "cancel", label: "الإلغاء", icon: "xCircle" },
];

interface Faq {
  q: string;
  a: string;
  topic: Topic;
  icon: IconName;
}

function buildFaqs(opts: { freeCancelHours: number; loaderFee: string }): Faq[] {
  return [
    {
      topic: "order",
      icon: "truck",
      q: "إزاي أطلب توصيلة؟",
      a: "من الصفحة الرئيسية دوس «اطلب توصيلة»، اكتب عنوان الاستلام والتسليم، اختار اليوم والساعة وحجم العربية المناسب لحاجتك. هتشوف السعر قدامك على طول، وبعدين دوس «اطلب التوصيلة» واكتب رقم موبايلك والكود اللي هيوصلك. هيظهرلك رقم الطلب، وهنكلمك نأكد معاك الميعاد.",
    },
    {
      topic: "order",
      icon: "calendar",
      q: "أقدر أغيّر ميعاد الطلب؟",
      a: "أيوه. كلمنا أو ابعتلنا على واتساب برقم الطلب والميعاد الجديد، وإحنا نغيّره لك طالما في عربية متاحة في الميعاد ده. يا ريت تبلغنا بدري قبل الميعاد بوقت كافي.",
    },
    {
      topic: "order",
      icon: "user",
      q: "لازم أعمل حساب عشان أطلب؟",
      a: "لأ. تقدر تشوف الأسعار وتجهّز طلبك من غير تسجيل. في الآخر بس هنطلب رقم موبايلك ونبعتلك كود تأكيد، وده بيبقى حسابك اللي تتابع منه طلباتك.",
    },
    {
      topic: "price",
      icon: "coins",
      q: "إزاي أعرف سعر التوصيلة؟",
      a: "السعر بيظهر لوحده وأنت بتجهّز الطلب وقبل ما تأكد. بيتحسب من: رسوم أساسية حسب حجم العربية + سعر الكيلو حسب المسافة + العمالة لو طلبتها − أي خصم. دوس «تفاصيل السعر» تحت عشان تشوف كل بند لوحده.",
    },
    {
      topic: "price",
      icon: "file",
      q: "هل السعر ده نهائي؟",
      a: "السعر اللي بيظهرلك تقديري حسب المسافة على الخريطة والحجم اللي اخترته. لو المسافة الحقيقية أو الحمولة مختلفة كتير، خدمة العملاء هتبلغك بالسعر النهائي قبل التنفيذ. مفيش أي مصاريف مخفية.",
    },
    {
      topic: "price",
      icon: "users",
      q: "العمالة (الشيّالين) بكام؟",
      a: `كل فرد عمالة بـ ${opts.loaderFee}. تقدر تطلب لحد 6 أفراد يساعدوا في التحميل والتنزيل، وبيتضافوا على السعر قدامك.`,
    },
    {
      topic: "price",
      icon: "ticket",
      q: "إزاي أستخدم كود الخصم؟",
      a: "في صفحة الطلب، اكتب الكود في خانة «كود الخصم» ودوس «تطبيق». لو الكود صحيح هيظهر الخصم في السعر على طول. بعض الأكواد ليها حد أدنى للطلب أو تاريخ انتهاء.",
    },
    {
      topic: "driver",
      icon: "mapPin",
      q: "إزاي أتابع السواق؟",
      a: "من «طلباتي» هتلاقي حالة طلبك خطوة بخطوة: استلمنا طلبك ← تم التأكيد ← جاري البحث عن سائق ← تم تعيين السائق (واسمه) ← السائق في الطريق ← تم التوصيل.",
    },
    {
      topic: "driver",
      icon: "clock",
      q: "السواق اتأخر أعمل إيه؟",
      a: "كلمنا على طول أو ابعتلنا على واتساب برقم الطلب، وإحنا هنتواصل مع السواق ونبلغك بالميعاد المتوقع لوصوله أو نتصرف في بديل.",
    },
    {
      topic: "driver",
      icon: "checkCircle",
      q: "السواقين بتوعكم معتمدين؟",
      a: "أيوه. كل السواقين موظفين في نقلة، وعربياتنا ملك الشركة، وكل سواق متسجّل عندنا ببطاقته ورخصة القيادة ورخصة العربية.",
    },
    {
      topic: "payment",
      icon: "card",
      q: "بدفع إزاي؟",
      a: "حالياً الدفع كاش. المبلغ هو الإجمالي اللي ظهرلك وقت الطلب (أو السعر النهائي اللي خدمة العملاء أكدته معاك). الدفع الإلكتروني جاي قريب.",
    },
    {
      topic: "cancel",
      icon: "xCircle",
      q: "إزاي ألغي الطلب؟",
      a: `كلمنا أو ابعتلنا على واتساب برقم الطلب وإحنا نلغيه لك. الإلغاء مجاني لحد ${opts.freeCancelHours} ساعات قبل الميعاد.`,
    },
  ];
}

export function HelpCenter({
  phone,
  phoneLabel,
  whatsapp,
  freeCancelHours,
  loaderFee,
}: {
  phone: string;
  phoneLabel: string;
  whatsapp: string;
  freeCancelHours: number;
  loaderFee: string;
}) {
  const faqs = useMemo(() => buildFaqs({ freeCancelHours, loaderFee }), [freeCancelHours, loaderFee]);
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<Topic | null>(null);
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
          <a
            href={`https://wa.me/${whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="tap mt-auto w-full rounded-xl bg-accent text-on-accent font-extrabold flex items-center justify-center gap-1.5 text-sm px-2"
          >
            <Icon name="whatsapp" className="w-5 h-5" /> ابعتلنا
          </a>
        </div>
        <div className="bg-panel border border-line rounded-card shadow-sm p-3 flex flex-col items-center text-center gap-1.5">
          <span className="w-14 h-14 rounded-full bg-primary-soft text-primary grid place-items-center">
            <Icon name="phone" className="w-7 h-7" />
          </span>
          <span className="font-extrabold leading-snug">اتصل بينا</span>
          <span className="text-xs text-muted">فريق خدمة العملاء</span>
          <a
            href={`tel:${phone}`}
            className="tap mt-auto w-full rounded-xl border-2 border-primary text-emph font-extrabold flex items-center justify-center gap-1.5 hover:bg-primary-soft"
          >
            <Icon name="phone" className="w-5 h-5 text-primary" />
            <span dir="ltr">{phoneLabel}</span>
          </a>
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
              const isOpen = open === f.q;
              return (
                <div key={f.q} className="bg-panel rounded-2xl shadow-sm border border-line overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : f.q)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center gap-3 p-3 text-right"
                  >
                    <span className="w-10 h-10 shrink-0 rounded-full bg-primary-soft text-primary grid place-items-center">
                      <Icon name={f.icon} className="w-5 h-5" />
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
