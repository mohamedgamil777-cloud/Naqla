import Link from "next/link";
import { listCategories } from "@/db/lib/categories";
import { getAppContent } from "@/db/lib/settings";
import { HeroScene } from "@/components/HeroScene";
import { HeroCarousel } from "@/components/HeroCarousel";
import { QuoteStarter } from "@/components/QuoteStarter";
import { photoVersion } from "@/lib/content";
import { VehicleImage } from "@/components/VehicleImage";
import { Icon, type IconName } from "@/components/Icons";

export const dynamic = "force-dynamic";

// Icons stay fixed per position; the texts come from admin → محتوى التطبيق.
const TRUST_ICONS: IconName[] = ["tag", "clock", "headset"];
const STEP_ICONS: IconName[] = ["mapPin", "truck", "calendar", "checkCircle"];

export default async function HomePage() {
  const [cats, content] = await Promise.all([listCategories(), getAppContent()]);
  const sizes = cats.filter((c) => c.sizeCode && c.active).sort((a, b) => a.sort - b.sort);
  const { home } = content;
  const TRUST = home.trust.map((t, i) => ({ t, icon: TRUST_ICONS[i] }));
  const STEPS = home.steps.map((t, i) => ({ t, icon: STEP_ICONS[i] }));
  const subtitle = home.subtitle.split(/\r?\n/);

  return (
    <div className="flex flex-col gap-12 md:gap-20 pb-6">
      {/* Hero — phone: pitch, order form, picture. Tablet and up: pitch + form beside the picture. */}
      <section className="px-4 md:px-4 pt-6 md:pt-12 lg:pt-16 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-x-10 lg:gap-x-16 md:items-center">
        <div className="flex flex-col gap-5 md:gap-7">
          <div>
            <h1 className="text-[2rem] md:text-[2.6rem] lg:text-[3.25rem] font-bold leading-[1.15] tracking-tight text-balance">
              {home.title}
            </h1>
            <p className="mt-3 md:mt-4 text-lg text-ink-2 leading-relaxed max-w-md">
              {subtitle.map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
            </p>
          </div>
          <div className="md:max-w-md">
            <QuoteStarter />
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-2">
            {TRUST.map((x) => (
              <li key={x.t} className="flex items-center gap-1.5">
                <Icon name={x.icon} className="w-4 h-4 text-primary" strokeWidth={2.1} />
                {x.t}
              </li>
            ))}
          </ul>
        </div>
        <div className="overflow-hidden rounded-card border border-line bg-panel-2">
          {home.heroImages.length ? (
            <HeroCarousel slides={home.heroImages.map((src, i) => `/api/hero/${i}?v=${photoVersion(src)}`)} />
          ) : (
            <HeroScene className="block w-full h-auto" />
          )}
        </div>
      </section>

      {/* Fleet — a spec sheet per size, not just a picture and a name */}
      {sizes.length > 0 && (
        <section aria-labelledby="fleet-title">
          <div className="px-4 flex items-end justify-between gap-4">
            <div>
              <h2 id="fleet-title" className="text-xl md:text-2xl font-bold">
                أحجام عربياتنا
              </h2>
              <p className="text-sm md:text-base text-muted mt-1">اختار على قد الحاجة اللي هتنقلها</p>
            </div>
            <Link
              href="/estimate"
              className="hidden md:inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              قارن واطلب
              <Icon name="chevronLeft" className="w-4 h-4" />
            </Link>
          </div>
          <ul className="mt-4 md:mt-6 px-4 flex gap-3 md:gap-4 overflow-x-auto snap-x pb-1 [scrollbar-width:none] lg:grid lg:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] lg:overflow-visible">
            {sizes.map((c) => (
              <li key={c.id} className="snap-start shrink-0 w-[10.5rem] md:w-[11.5rem] lg:w-auto">
                <Link
                  href={`/estimate?size=${c.sizeCode}`}
                  className="group h-full flex flex-col bg-panel border border-line rounded-card overflow-hidden hover:border-primary/60"
                >
                  <div className="relative aspect-[4/3] bg-panel-2">
                    {c.image ? (
                      <VehicleImage src={c.image} alt={c.name} sizes="(max-width:768px) 170px, 220px" />
                    ) : (
                      <div className="grid place-items-center h-full">
                        <Icon name="truck" className="w-10 h-10 text-primary/70" strokeWidth={1.5} />
                      </div>
                    )}
                    <span
                      className="absolute top-2 start-2 rounded-md bg-panel px-1.5 py-0.5 text-xs font-bold text-ink"
                      dir="ltr"
                    >
                      {`${c.sizeCode}`}
                    </span>
                  </div>
                  <div className="p-3 flex flex-col gap-1.5 flex-1">
                    <span className="font-semibold leading-snug">{c.name}</span>
                    <dl className="text-[13px] text-muted flex flex-col gap-0.5">
                      {c.capacityKg ? (
                        <div className="flex justify-between gap-2">
                          <dt>الحمولة</dt>
                          <dd className="text-ink-2 font-medium">
                            حتى {c.capacityKg.toLocaleString("en-US")} كجم
                          </dd>
                        </div>
                      ) : null}
                      {c.dims ? (
                        <div className="flex justify-between gap-2">
                          <dt>المقاس</dt>
                          <dd className="text-ink-2 font-medium">{c.dims}</dd>
                        </div>
                      ) : null}
                    </dl>
                    <span className="mt-auto pt-2 text-sm font-semibold text-primary flex items-center gap-1 group-hover:gap-1.5 transition-[gap]">
                      اطلب الحجم ده
                      <Icon name="chevronLeft" className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* How it works — a numbered timeline: down the side on phones, across from tablet up */}
      <section aria-labelledby="how-title" className="px-4">
        <h2 id="how-title" className="text-xl md:text-2xl font-bold">
          بتشتغل إزاي؟
        </h2>
        <p className="text-sm md:text-base text-muted mt-1">{STEPS.length} خطوات بسيطة</p>
        <ol className="mt-6 md:mt-8 grid gap-6 md:gap-6 md:grid-cols-4">
          {STEPS.map((x, i) => (
            <li key={x.t} className="relative flex md:flex-col gap-4 md:gap-3">
              {/* connector to the next step */}
              {i < STEPS.length - 1 && (
                <span
                  className="absolute bg-line-2 start-[19px] top-11 bottom-[-1.5rem] w-px md:start-12 md:end-[-1.5rem] md:top-5 md:bottom-auto md:w-auto md:h-px"
                  aria-hidden
                />
              )}
              <span className="relative z-10 w-10 h-10 shrink-0 grid place-items-center rounded-full bg-panel border border-line-2 text-primary">
                <Icon name={x.icon} className="w-5 h-5" strokeWidth={2} />
              </span>
              <div className="pt-1 md:pt-0">
                <div className="text-xs font-semibold text-muted">خطوة {i + 1}</div>
                <div className="mt-0.5 font-semibold leading-snug">{x.t}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Closing call to action */}
      <section className="mx-4 rounded-card bg-bar-ink text-white px-6 py-8 md:px-10 md:py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">السعر قدامك قبل ما تطلب</h2>
          <p className="mt-1.5 text-white/70">حدد المكانين والحجم، وشوف التكلفة بالتفصيل في ثواني.</p>
        </div>
        <Link
          href="/estimate"
          className="tap shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-accent text-on-accent px-6 font-semibold hover:brightness-95"
        >
          اطلب توصيلة
          <Icon name="arrowLeft" className="w-5 h-5" strokeWidth={2.2} />
        </Link>
      </section>
    </div>
  );
}
