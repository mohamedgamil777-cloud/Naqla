import { notFound, redirect } from "next/navigation";
import { repo } from "@/data/repo";
import { getSession } from "@/services/session";
import { formatEgp } from "@/lib/money";
import { labelDateArabic, labelTime } from "@/lib/time";
import { durationLabel } from "@/lib/client-time";
import { BookingStatusBadge, PriceBreakdown, LinkButton } from "@/components/ui";
import { CancelButton } from "@/components/CancelButton";

export const dynamic = "force-dynamic";

export default async function BookingDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const session = await getSession();
  const b = await repo.getBooking(code);
  if (!b) notFound();
  // Only the owner (by phone) may view.
  if (!session || session.phone !== b.contactPhone) redirect("/login");

  const canCancel = ["pending", "confirmed", "ready"].includes(b.status);
  const wa = (process.env.NEXT_PUBLIC_WHATSAPP ?? "+201000000000").replace(/\D/g, "");

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">حجز #{b.code}</h1>
        <BookingStatusBadge status={b.status} />
      </div>

      <div className="bg-panel border border-line rounded-card p-4 flex flex-col gap-2">
        <Row k="العربية" v={b.vehicleName} />
        <Row k="ميعاد الاستلام" v={`${labelDateArabic(b.startsAt)} — ${labelTime(b.startsAt)}`} />
        <Row k="ميعاد التسليم" v={labelTime(b.endsAt)} />
        <Row k="المدة" v={durationLabel(b.hours)} />
        <Row k="المكان" v={b.delivery ? "توصيل لعندك" : b.branchName} />
        <Row k="السائق" v={b.withDriver ? "مع سائق" : "بدون سائق"} />
        {b.loaders > 0 && <Row k="العمالة" v={`${b.loaders} ${b.loaders === 1 ? "فرد" : "أفراد"}`} />}
        <Row k="باسم" v={b.contactName ?? "-"} />
      </div>

      <PriceBreakdown quote={b.priceSnapshot} />

      <div className="flex flex-col gap-3">
        {canCancel && <CancelButton code={b.code} />}
        <div className="grid grid-cols-2 gap-3">
          <a
            href={`tel:${process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "+201000000000"}`}
            className="tap inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-lg font-bold bg-panel border-2 border-line-2"
          >
            📞 اتصل بنا
          </a>
          <a
            href={`https://wa.me/${wa}?text=${encodeURIComponent(`بخصوص حجز ${b.code}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="tap inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-lg font-bold bg-[#25D366] text-white"
          >
            💬 واتساب
          </a>
        </div>
        <LinkButton href="/bookings" variant="ghost" full>كل حجوزاتي</LinkButton>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{k}</span>
      <span className="font-semibold text-end">{v}</span>
    </div>
  );
}
