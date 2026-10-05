import Link from "next/link";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Hero */}
      <section className="bg-primary text-white rounded-card p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold leading-snug">محتاج تنقل حاجة؟ 🚚</h1>
        <p className="mt-2 text-white/85 text-lg">اطلب عربية من مكان لمكان، واعرف السعر قبل ما تطلب.</p>
        <Link
          href="/estimate"
          className="tap mt-5 bg-accent text-accent-ink rounded-2xl py-4 text-center font-extrabold text-xl flex items-center justify-center gap-2"
        >
          <span className="text-2xl" aria-hidden>🗺️</span> اطلب توصيلة
        </Link>
      </section>

      {/* How it works */}
      <section>
        <h2 className="text-xl font-extrabold mb-3">بتشتغل إزاي؟</h2>
        <div className="flex flex-col gap-3">
          {[
            { icon: "📍", t: "حدد الاستلام والتسليم", s: "اختار المكانين على الخريطة" },
            { icon: "🚐", t: "اختار حجم العربية", s: "هنرشّحلك المناسب لحمولتك" },
            { icon: "📅", t: "حدّد الميعاد", s: "اختار اليوم والساعة اللي تناسبك" },
            { icon: "✅", t: "اطلب واستنى التأكيد", s: "هنتواصل معاك ونبعتلك السواق" },
          ].map((x, i) => (
            <div key={x.t} className="bg-panel border border-line rounded-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 shrink-0 grid place-items-center rounded-full bg-primary-soft text-primary-ink font-extrabold">{i + 1}</div>
              <div className="text-2xl" aria-hidden>{x.icon}</div>
              <div>
                <div className="font-bold">{x.t}</div>
                <div className="text-sm text-muted">{x.s}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust strip */}
      <section className="grid grid-cols-3 gap-3 text-center">
        {[
          { icon: "💰", t: "سعر واضح" },
          { icon: "⏱️", t: "في دقايق" },
          { icon: "✅", t: "بدون تعقيد" },
        ].map((x) => (
          <div key={x.t} className="bg-panel border border-line rounded-2xl py-4 px-2">
            <div className="text-2xl">{x.icon}</div>
            <div className="text-sm font-semibold mt-1">{x.t}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
