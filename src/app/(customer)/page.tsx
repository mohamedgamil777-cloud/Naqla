import Link from "next/link";
import { repo } from "@/data/repo";
import { HeroScene } from "@/components/HeroScene";
import { VehicleImage } from "@/components/VehicleImage";
import { Icon, type IconName } from "@/components/Icons";

export const dynamic = "force-dynamic";

// Icons stay fixed per position; the texts come from admin → محتوى التطبيق.
const TRUST_ICONS: IconName[] = ["tag", "clock", "headset"];
const STEP_ICONS: IconName[] = ["mapPin", "truck", "calendar", "checkCircle"];

export default async function HomePage() {
  const [cats, content] = await Promise.all([repo.listCategories(), repo.getAppContent()]);
  const sizes = cats.filter((c) => c.sizeCode).sort((a, b) => a.sort - b.sort);
  const { home } = content;
  const TRUST = home.trust.map((t, i) => ({ t, icon: TRUST_ICONS[i] }));
  const STEPS = home.steps.map((t, i) => ({ t, icon: STEP_ICONS[i] }));
  const subtitle = home.subtitle.split(/\r?\n/);

  return (
    <div className="flex flex-col gap-7 pb-4">
      {/* Hero */}
      <section className="px-4 pt-5">
        <h1 className="text-[1.9rem] font-extrabold leading-tight">{home.title}</h1>
        <p className="mt-2 text-lg text-muted leading-relaxed">
          {subtitle.map((line, i) => (
            <span key={i} className="block">
              {line}
            </span>
          ))}
        </p>
        <div className="mt-4 overflow-hidden rounded-card border border-line shadow-[0_8px_24px_rgba(16,32,28,0.08)]">
          {home.heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={home.heroImage} alt="نقلة" className="block w-full aspect-[36/19] object-cover" />
          ) : (
            <HeroScene className="block w-full h-auto" />
          )}
        </div>
        <Link
          href="/estimate"
          className="tap mt-4 bg-accent text-on-accent hover:brightness-105 shadow-[0_6px_16px_rgba(242,165,65,0.35)] rounded-2xl py-4 px-5 font-extrabold text-xl flex items-center justify-center gap-3"
        >
          اطلب توصيلة
          <Icon name="chevronLeft" className="w-6 h-6" strokeWidth={2.6} />
        </Link>
      </section>

      {/* Trust badges */}
      <section className="px-4 grid grid-cols-3 gap-3">
        {TRUST.map((x) => (
          <div key={x.t} className="bg-panel border border-line rounded-2xl py-4 px-2 flex flex-col items-center gap-2 text-center">
            <Icon name={x.icon} className="w-7 h-7 text-primary" />
            <div className="text-sm font-bold leading-snug">{x.t}</div>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section className="px-4">
        <h2 className="text-xl font-extrabold">بتشتغل إزاي؟</h2>
        <p className="text-sm text-muted">4 خطوات بسيطة</p>
        <ol className="mt-3 grid grid-cols-4 gap-2">
          {STEPS.map((x, i) => (
            <li key={x.t} className="bg-panel border border-line rounded-2xl py-3 px-1.5 flex flex-col items-center gap-2 text-center">
              <span className="w-6 h-6 grid place-items-center rounded-full bg-primary-soft text-emph text-xs font-extrabold">{i + 1}</span>
              <Icon name={x.icon} className="w-7 h-7 text-primary" />
              <span className="text-xs font-bold leading-snug">{x.t}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Truck sizes */}
      {sizes.length > 0 && (
        <section>
          <div className="px-4">
            <h2 className="text-xl font-extrabold">أحجام عربياتنا</h2>
            <p className="text-sm text-muted">مناسبة لكل احتياجاتك</p>
          </div>
          <div className="mt-3 px-4 flex gap-3 overflow-x-auto snap-x pb-1 [scrollbar-width:none]">
            {sizes.map((c) => (
              <Link
                key={c.id}
                href={`/estimate?size=${c.sizeCode}`}
                className="snap-start shrink-0 w-[7.5rem] bg-panel border border-line rounded-2xl p-2 flex flex-col items-center gap-1.5 hover:border-primary"
              >
                <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-panel-2">
                  {c.image ? (
                    <VehicleImage src={c.image} alt={c.name} sizes="120px" />
                  ) : (
                    <div className="grid place-items-center h-full">
                      <Icon name="truck" className="w-10 h-10 text-primary" />
                    </div>
                  )}
                </div>
                <span className="text-sm font-bold">{c.name}</span>
                {c.capacityKg ? (
                  <span className="text-[11px] text-muted -mt-1">حتى {c.capacityKg.toLocaleString("en-US")} كجم</span>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
