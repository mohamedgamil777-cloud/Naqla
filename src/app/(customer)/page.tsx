import Link from "next/link";
import { repo } from "@/data/repo";
import { VehicleCard } from "@/components/VehicleCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const vehicles = await repo.listVehicles();
  const available = vehicles.filter((v) => v.status === "available");

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Hero */}
      <section className="bg-primary text-white rounded-card p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold leading-snug">محتاج عربية نقل؟</h1>
        <p className="mt-2 text-white/85 text-lg">اختار العربية والوقت واحجز بسهولة</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link
            href="/book?kind=pickup"
            className="tap bg-white text-primary rounded-2xl py-4 text-center font-extrabold text-lg flex flex-col items-center gap-1"
          >
            <span className="text-3xl" aria-hidden>🚚</span> بيك أب
          </Link>
          <Link
            href="/book?kind=van"
            className="tap bg-accent text-accent-ink rounded-2xl py-4 text-center font-extrabold text-lg flex flex-col items-center gap-1"
          >
            <span className="text-3xl" aria-hidden>🚐</span> فان
          </Link>
        </div>
        <Link
          href="/estimate"
          className="tap mt-3 bg-white/15 hover:bg-white/25 rounded-2xl py-3.5 px-4 flex items-center justify-between font-bold"
        >
          <span className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden>🗺️</span> احسب سعر التوصيل من مكان لمكان
          </span>
          <span aria-hidden>←</span>
        </Link>
      </section>

      {/* Available now */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-extrabold flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-ok inline-block" /> متاح دلوقتي
          </h2>
          <span className="text-muted text-sm">{available.length} عربية</span>
        </div>
        <div className="flex flex-col gap-4">
          {available.map((v) => (
            <VehicleCard key={v.id} v={v} />
          ))}
          {available.length === 0 && (
            <p className="text-muted text-center py-8">مفيش عربيات متاحة دلوقتي، جرب كمان شوية.</p>
          )}
        </div>
      </section>

      {/* Trust strip */}
      <section className="grid grid-cols-3 gap-3 text-center">
        {[
          { icon: "⏱️", t: "حجز في دقيقتين" },
          { icon: "💰", t: "سعر واضح" },
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
