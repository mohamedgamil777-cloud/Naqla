import Link from "next/link";
import { HeroScene } from "@/components/HeroScene";
import { HeroCarousel } from "@/components/HeroCarousel";
import { QuoteStarter } from "@/components/QuoteStarter";
import { photoVersion, type AppContent } from "@/lib/content";
import type { CategoryDTO } from "@/types/vehicle";
import { VehicleImage } from "@/components/VehicleImage";
import { Icon, type IconName } from "@/components/Icons";

// Icons (and the short line under each step) stay fixed per position;
// the titles come from admin → محتوى التطبيق.
const TRUST_ICONS: IconName[] = ["tag", "clock", "checkCircle"];
const STEP_ICONS: IconName[] = ["mapPin", "truck", "calendar", "checkCircle"];
const STEP_NOTES = ["منين لفين؟", "على قد احتياجاتك", "اليوم والوقت المناسب", "وسواق انقلي يتولى المهمة"];

const WHY: { icon: IconName; title: string; note: string }[] = [
  { icon: "truck", title: "عربيات بأحجام مختلفة", note: "لجميع الاحتياجات" },
  { icon: "userCheck", title: "سواق تابع لانقلي", note: "ومعتمد" },
  { icon: "tag", title: "سعر واضح قبل الحجز", note: "بدون مفاجآت" },
];

/** The home page's markup. Data is loaded by app/(customer)/page.tsx. */
export function HomeView({ sizes, content }: { sizes: CategoryDTO[]; content: AppContent }) {
  const { home, order } = content;
  const TRUST = home.trust.map((t, i) => ({ t, icon: TRUST_ICONS[i] }));
  const STEPS = home.steps.map((t, i) => ({ t, icon: STEP_ICONS[i], note: STEP_NOTES[i] }));
  const subtitle = home.subtitle.replace(/\r?\n/g, " ");
  // the last word of the headline gets the brand underline
  const titleWords = home.title.trim().split(/\s+/);
  const titleLast = titleWords.pop();

  return (
    <div className="flex flex-col gap-14 md:gap-20 pb-8">
      {/* ---------- Hero ---------- */}
      <section className="relative">
        {/* soft brand wash behind the hero */}
        <div
          className="absolute inset-x-0 top-0 h-[78%] -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(19,95,90,0.10),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(242,165,65,0.10),transparent_55%)]"
          aria-hidden
        />
        <div className="px-4 pt-6 md:pt-12 grid gap-6 md:gap-x-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-center">
          {/* phones show no pitch text (picture first); the headline stays for screen readers */}
          <h1 className="sr-only md:hidden">{home.title}</h1>
          {/* pitch — right side on desktop, hidden on phones */}
          <div className="hidden md:block md:col-start-1 md:row-start-1">
            <h1 className="text-[2.2rem] md:text-[2.9rem] lg:text-[3.5rem] font-extrabold leading-[1.15] tracking-tight text-balance">
              {titleWords.join(" ")}{" "}
              <span className="relative inline-block">
                <span className="relative z-10">{titleLast}</span>
                <span
                  className="absolute inset-x-[-0.15em] bottom-[0.08em] h-[0.32em] rounded-full bg-primary/20 -rotate-1"
                  aria-hidden
                />
              </span>
            </h1>
            <p className="mt-4 text-[1.4rem] md:text-[1.75rem] font-bold leading-snug text-ink">
              أجّر عربية نقل بسواق،
              <br />
              <span className="relative inline-block text-primary">
                واحنا
                <span className="absolute inset-x-0 -bottom-0.5 h-1 rounded-full bg-primary" aria-hidden />
              </span>{" "}
              نتولى الباقي.
            </p>
            <p className="mt-4 text-base md:text-lg text-muted leading-relaxed max-w-md">{subtitle}</p>
          </div>

          {/* picture — left side on desktop, above the order card on phones */}
          <div className="order-2 md:order-none md:col-start-2 md:row-start-1 overflow-hidden rounded-3xl border border-line bg-panel-2 shadow-[0_18px_40px_rgba(16,32,28,0.10)]">
            {home.heroImages.length ? (
              <HeroCarousel slides={home.heroImages.map((src, i) => `/api/hero/${i}?v=${photoVersion(src)}`)} />
            ) : (
              <HeroScene className="block w-full h-auto" />
            )}
          </div>

          {/* order card — full width, lifted over the picture's edge on desktop */}
          <div className="order-3 md:order-none md:col-span-2 md:row-start-2 relative z-10 md:-mt-14 md:mx-6">
            <QuoteStarter />
          </div>
        </div>

        {/* trust strip */}
        <ul className="mt-6 md:mt-8 mx-4 md:mx-10 grid grid-cols-3">
          {TRUST.map((x) => (
            <li
              key={x.t}
              className="md:[&:not(:first-child)]:border-s border-line-2 flex flex-col md:flex-row items-center justify-center gap-1.5 md:gap-2.5 px-2 text-center text-sm md:text-base font-semibold text-ink-2"
            >
              <Icon name={x.icon} className="w-6 h-6 md:w-7 md:h-7 text-primary shrink-0" strokeWidth={1.9} />
              {x.t}
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- Fleet ---------- */}
      {sizes.length > 0 && (
        <section id="fleet" aria-labelledby="fleet-title" className="scroll-mt-24">
          <div className="px-4">
            <h2 id="fleet-title" className="text-2xl md:text-[2rem] font-extrabold">
              أحجام عربياتنا
            </h2>
            <p className="text-base text-muted mt-1">اختار على قد الحاجة اللي هتنقلها</p>
          </div>
          <ul className="mt-5 md:mt-7 px-4 flex gap-4 overflow-x-auto snap-x pb-2 [scrollbar-width:none] md:grid md:grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] md:overflow-visible">
            {sizes.map((c) => (
              <li key={c.id} className="snap-start shrink-0 w-[16rem] md:w-auto">
                <Link
                  href={`/estimate?size=${c.sizeCode}`}
                  className="group h-full flex flex-col bg-panel rounded-2xl overflow-hidden border border-line/80 shadow-[0_6px_20px_rgba(16,32,28,0.06)] hover:shadow-[0_12px_28px_rgba(16,32,28,0.12)] hover:-translate-y-0.5 transition-[box-shadow,transform]"
                >
                  <div className="relative aspect-[16/10] bg-gradient-to-b from-primary-soft to-[#f3f6f4]">
                    {c.image ? (
                      <VehicleImage src={c.image} alt={c.name} sizes="(max-width:768px) 260px, 360px" />
                    ) : (
                      <div className="grid place-items-center h-full">
                        <Icon name="truck" className="w-14 h-14 text-primary/70" strokeWidth={1.4} />
                      </div>
                    )}
                    <span
                      className="absolute top-3 start-3 w-9 h-9 grid place-items-center rounded-full bg-panel shadow-sm text-base font-extrabold text-ink"
                      dir="ltr"
                    >
                      {`${c.sizeCode}`}
                    </span>
                  </div>
                  <div className="p-4 flex flex-col gap-2.5 flex-1">
                    <span className="text-xl font-extrabold leading-snug">{c.name}</span>
                    <dl className="text-sm flex flex-col gap-2">
                      {c.capacityKg ? (
                        <div className="flex items-center gap-2">
                          <Icon name="weight" className="w-[18px] h-[18px] text-primary" strokeWidth={1.9} />
                          <dt className="text-muted w-14">الحمولة</dt>
                          <dd className="text-ink font-bold">حتى {c.capacityKg.toLocaleString("en-US")} كجم</dd>
                        </div>
                      ) : null}
                      {c.dims ? (
                        <div className="flex items-center gap-2">
                          <Icon name="box" className="w-[18px] h-[18px] text-primary" strokeWidth={1.9} />
                          <dt className="text-muted w-14">المقاس</dt>
                          <dd className="text-ink font-bold">{c.dims}</dd>
                        </div>
                      ) : null}
                    </dl>
                    <span className="mt-auto pt-2">
                      <span className="w-full rounded-xl bg-primary-soft text-primary-ink py-2.5 font-bold flex items-center justify-center gap-1.5 group-hover:bg-primary group-hover:text-white transition-colors">
                        اطلب الحجم ده
                        <Icon name="arrowLeft" className="w-4 h-4" strokeWidth={2.4} />
                      </span>
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------- How it works ---------- */}
      <section id="how" aria-labelledby="how-title" className="px-4 scroll-mt-24 text-center">
        <h2 id="how-title" className="text-2xl md:text-[2rem] font-extrabold">
          <span className="relative inline-block">
            <span className="relative z-10">بتشتغل إزاي؟</span>
            <span className="absolute inset-x-0 bottom-1 h-2 rounded-full bg-primary/20" aria-hidden />
          </span>
        </h2>
        <p className="text-base text-muted mt-1">{STEPS.length} خطوات بسيطة</p>
        <ol className="mt-6 md:mt-8 grid grid-cols-2 gap-3 md:flex md:items-stretch md:gap-2">
          {STEPS.map((x, i) => (
            <li key={x.t} className="contents">
              <div className="md:flex-1 bg-panel rounded-2xl border border-line/80 p-4 md:p-5 flex flex-col items-center md:flex-row md:items-center gap-3 text-center md:text-start">
                <span className="w-9 h-9 shrink-0 grid place-items-center rounded-full bg-primary-soft text-primary-ink text-lg font-extrabold">
                  {i + 1}
                </span>
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <Icon name={x.icon} className="w-8 h-8 text-primary" strokeWidth={1.7} />
                  <span className="font-extrabold leading-snug">{x.t}</span>
                  {x.note && <span className="text-[13px] text-muted leading-snug">{x.note}</span>}
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <Icon
                  name="chevronLeft"
                  className="hidden md:block self-center w-5 h-5 text-ink-2 shrink-0"
                  strokeWidth={2.4}
                  aria-hidden
                />
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- What we move (cargo types from admin → محتوى التطبيق) ---------- */}
      {order.cargo.length > 0 && (
        <section aria-labelledby="needs-title" className="px-4 text-center">
          <h2 id="needs-title" className="text-2xl md:text-[2rem] font-extrabold">
            انقلي لكل احتياجاتك
          </h2>
          <ul className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:flex md:justify-center gap-3 md:gap-4">
            {order.cargo.map((g) => (
              <li key={g.label} className="md:w-40">
                <Link
                  href={`/estimate?size=${g.size}`}
                  className="h-full bg-panel rounded-2xl border border-line/80 py-5 px-3 flex flex-col items-center gap-2.5 hover:border-primary/60 hover:shadow-[0_8px_22px_rgba(16,32,28,0.08)]"
                >
                  <Icon name={g.icon as IconName} className="w-9 h-9 text-primary" strokeWidth={1.6} />
                  <span className="font-bold text-[15px] leading-snug">{g.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------- Why ENQELLY ---------- */}
      <section
        aria-labelledby="why-title"
        className="mx-4 rounded-3xl bg-primary text-white px-6 py-7 md:px-10 md:py-8 grid gap-6 md:grid-cols-[auto_1fr] md:items-center md:gap-10"
      >
        <h2 id="why-title" className="text-2xl md:text-[1.9rem] font-extrabold leading-tight">
          ليه
          <br className="hidden md:block" /> تختار انقلي؟
        </h2>
        <ul className="grid gap-5 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-x-reverse divide-white/20">
          {WHY.map((w) => (
            <li key={w.title} className="flex items-center gap-3 sm:justify-center sm:px-4">
              <Icon name={w.icon} className="w-8 h-8 shrink-0 text-white" strokeWidth={1.6} />
              <div>
                <div className="font-bold leading-snug">{w.title}</div>
                <div className="text-sm text-white/75">{w.note}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- Closing call to action ---------- */}
      <section className="relative px-4 flex justify-center">
        <Icon
          name="mapPin"
          className="hidden md:block absolute end-8 top-1/2 -translate-y-1/2 w-9 h-9 text-accent/50"
          strokeWidth={1.8}
          aria-hidden
        />
        <Icon
          name="mapPin"
          className="hidden md:block absolute start-8 top-1/2 -translate-y-1/2 w-9 h-9 text-accent/50"
          strokeWidth={1.8}
          aria-hidden
        />
        <Link
          href="/estimate"
          className="tap w-full max-w-md inline-flex items-center justify-center gap-3 rounded-2xl bg-accent text-on-accent px-8 py-4 text-xl md:text-2xl font-extrabold shadow-[0_10px_24px_rgba(242,165,65,0.40)] hover:brightness-95"
        >
          اطلب توصيلة الآن
          <Icon name="arrowLeft" className="w-6 h-6" strokeWidth={2.6} />
        </Link>
      </section>
    </div>
  );
}
