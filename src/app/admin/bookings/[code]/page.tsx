import Link from "next/link";
import { notFound } from "next/navigation";
import { repo } from "@/data/repo";
import { formatEgp } from "@/lib/money";
import { labelDateArabic, labelTime } from "@/lib/time";
import { durationLabel } from "@/lib/client-time";
import { BookingStatusBadge, PriceBreakdown } from "@/components/ui";
import { BookingManage } from "@/components/admin/BookingManage";
import { PaymentsPanel } from "@/components/admin/PaymentsPanel";
import { ExtendTrip } from "@/components/admin/ExtendTrip";

export const dynamic = "force-dynamic";

export default async function AdminBookingDetail({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const b = await repo.getBooking(code);
  if (!b) notFound();

  const [payments, drivers, docs] = await Promise.all([
    repo.listPayments(code),
    repo.listDrivers(),
    b.contactPhone ? repo.listDocuments(b.contactPhone) : Promise.resolve([]),
  ]);

  const idDoc = docs.find((d) => d.type === "national_id");
  const licDoc = docs.find((d) => d.type === "license");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/bookings" className="text-primary font-semibold">الحجوزات</Link>
        <span className="text-muted">/ #{b.code}</span>
      </div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">حجز #{b.code}</h1>
        <BookingStatusBadge status={b.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* info */}
        <div className="bg-panel border border-line rounded-card p-5 flex flex-col gap-2">
          {b.source === "agent" && (
            <div className="bg-accent-soft text-accent-ink rounded-xl px-3 py-2 text-sm font-bold mb-1">
              📝 حجز بواسطة الموظف{b.agentName ? `: ${b.agentName}` : ""}
            </div>
          )}
          <Row k="العميل" v={b.contactName ?? "-"} />
          <Row k="الموبايل" v={b.contactPhone ?? "-"} ltr />
          <Row k="العربية" v={b.vehicleName} />
          <Row k="الاستلام" v={`${labelDateArabic(b.startsAt)} — ${labelTime(b.startsAt)}`} />
          <Row k="التسليم" v={labelTime(b.endsAt)} />
          <Row k="المدة" v={durationLabel(b.hours)} />
          <Row k="المكان" v={b.delivery ? "توصيل" : b.branchName} />
          <Row k="السائق" v={b.withDriver ? (b.driverName ?? "مطلوب سائق") : "بدون سائق"} />
          {b.loaders > 0 && <Row k="العمالة" v={`${b.loaders} أفراد`} />}
        </div>

        <BookingManage code={b.code} status={b.status} driverId={b.driverId} drivers={drivers} />
      </div>

      <PriceBreakdown quote={b.priceSnapshot} />

      <ExtendTrip code={b.code} currentHours={b.hours} status={b.status} />

      <PaymentsPanel code={b.code} payments={payments} dueTotal={b.priceSnapshot.total} depositDue={b.priceSnapshot.deposit} />

      {/* Customer documents (for verification at handover) */}
      <div className="bg-panel border border-line rounded-card p-5">
        <h2 className="font-extrabold text-lg mb-3">مستندات العميل</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DocView title="البطاقة الشخصية" url={idDoc?.url} expiry={idDoc?.expiry} />
          <DocView title="رخصة القيادة" url={licDoc?.url} expiry={licDoc?.expiry} />
        </div>
      </div>
    </div>
  );
}

function DocView({ title, url, expiry }: { title: string; url?: string; expiry?: string | null }) {
  return (
    <div className="border border-line rounded-xl p-3">
      <div className="font-bold mb-2">{title}</div>
      {url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={title} className="w-full h-44 object-cover rounded-lg bg-panel-2" />
          {expiry && <div className="text-sm text-muted mt-2">تنتهي: {expiry}</div>}
        </>
      ) : (
        <div className="h-44 grid place-items-center text-muted bg-panel-2 rounded-lg text-sm">لسه مترفعتش</div>
      )}
    </div>
  );
}

function Row({ k, v, ltr }: { k: string; v: string; ltr?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted">{k}</span>
      <span className="font-semibold text-end" dir={ltr ? "ltr" : undefined}>{v}</span>
    </div>
  );
}
