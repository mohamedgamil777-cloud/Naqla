import { NextResponse } from "next/server";
import { repo } from "@/data/repo";
import { photoVersion } from "@/data/content";
import { cairoDateISO, cairoDateTime, labelDateArabic, TZ } from "@/lib/time";
import { formatInTimeZone } from "date-fns-tz";
import { vehicleImageUrl } from "../_lib";

export const dynamic = "force-dynamic";

/** Everything the app needs to draw its screens: content, car sizes, order options and bookable slots. */
export async function GET() {
  const [cats, branch, business, content] = await Promise.all([
    repo.listCategories(),
    repo.defaultBranch(),
    repo.getBusiness(),
    repo.getAppContent(),
  ]);

  const sizes = cats
    .filter((c) => c.sizeCode && c.active)
    .sort((a, b) => a.sort - b.sort)
    .map((c) => ({
      id: c.id,
      name: c.name,
      sizeCode: c.sizeCode,
      capacityKg: c.capacityKg,
      dims: c.dims,
      description: c.description,
      image: vehicleImageUrl(c),
    }));

  // Bookable days + 30-minute slots inside working hours (today only from now + lead time).
  const now = new Date();
  const today = cairoDateISO(now);
  const nowMin = Number(formatInTimeZone(now, TZ, "H")) * 60 + Number(formatInTimeZone(now, TZ, "m"));
  const all: string[] = [];
  for (let m = branch.working.open * 60; m < branch.working.close * 60; m += 30) {
    all.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  const days = [];
  for (let i = 0; i <= business.advanceDays; i++) {
    const date = cairoDateISO(new Date(cairoDateTime(today, 12).getTime() + i * 864e5));
    const slots = i === 0 ? all.filter((t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3)) >= nowMin + business.nowLeadHours * 60) : all;
    if (!slots.length) continue;
    const label = i === 0 ? "النهارده" : i === 1 ? "بكره" : labelDateArabic(cairoDateTime(date, 12));
    days.push({ date, label, slots });
  }

  return NextResponse.json({
    contact: { supportPhone: content.supportPhone, whatsapp: content.whatsapp },
    home: {
      title: content.home.title,
      subtitle: content.home.subtitle,
      heroImages: content.home.heroImages.map((src, i) => `/api/hero/${i}?v=${photoVersion(src)}`),
      trust: content.home.trust,
      steps: content.home.steps,
    },
    faqs: content.faqs,
    faqVars: { cancelHours: business.freeCancelHours, loaderFee: content.order.loaderFee },
    sizes,
    order: {
      loaderFee: content.order.loaderFee,
      maxLoaders: content.order.maxLoaders,
      disclaimer: content.order.disclaimer,
      cargo: content.order.cargo,
      days,
      center: { lat: branch.lat ?? 30.0444, lng: branch.lng ?? 31.2357 },
    },
  });
}
