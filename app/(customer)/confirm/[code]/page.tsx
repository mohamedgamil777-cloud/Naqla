import { notFound } from "next/navigation";
import { canViewBooking } from "@/lib/authz";
import { getBooking } from "@/db/lib/bookings";
import { getAppContent } from "@/db/lib/settings";
import { waDigits } from "@/lib/content";
import { formatEgp } from "@/lib/money";
import { labelDateArabic, labelTime } from "@/lib/time";
import { LinkButton } from "@/components/ui";
import { Icon } from "@/components/Icons";
import { durationLabel } from "@/lib/client-time";

export const dynamic = "force-dynamic";

export default async function ConfirmPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const b = await getBooking(code);
  // A booking code alone is not authorization: only its customer (by session phone)
  // or staff allowed to read bookings may see it. Others get the same 404 as a wrong code.
  if (!b || !(await canViewBooking(b.contactPhone))) notFound();

  const wa = waDigits((await getAppContent()).whatsapp);
  const waMsg = encodeURIComponent(`مرحباً، بخصوص حجز رقم ${b.code} (${b.vehicleName})`);

  return (
    <div className="p-4 flex flex-col gap-4 w-full max-w-2xl mx-auto">
      <div className="bg-ok-soft text-ok rounded-card p-6 text-center">
        <span className="mx-auto mb-2 w-14 h-14 rounded-full bg-ok-soft text-ok grid place-items-center">
          <Icon name="check" className="w-7 h-7" strokeWidth={2.6} />
        </span>
        <h1 className="text-2xl font-extrabold">تم الحجز بنجاح</h1>
        <p className="mt-1 text-ink-2">رقم الحجز</p>
        <p className="text-4xl font-extrabold tracking-wider text-ink">#{b.code}</p>
      </div>

      <div className="bg-panel border border-line rounded-card p-4 flex flex-col gap-2">
        <Row k="العربية" v={b.vehicleName} />
        <Row k="ميعاد الاستلام" v={`${labelDateArabic(b.startsAt)} — ${labelTime(b.startsAt)}`} />
        <Row k="ميعاد التسليم" v={`${labelTime(b.endsAt)}`} />
        <Row k="مدة الإيجار" v={durationLabel(b.hours)} />
        <Row k="المكان" v={b.delivery ? "توصيل لعندك" : `${b.branchName}`} />
        <Row k="السائق" v={b.withDriver ? "مع سائق" : "بدون سائق"} />
        {b.loaders > 0 && <Row k="العمالة" v={`${b.loaders} ${b.loaders === 1 ? "فرد" : "أفراد"}`} />}
        <div className="flex justify-between border-t border-dashed border-line-2 pt-3 mt-1">
          <span className="font-bold text-lg">الإجمالي</span>
          <span className="font-extrabold text-xl text-emph">{formatEgp(b.priceSnapshot.total)}</span>
        </div>
        {b.priceSnapshot.deposit > 0 && (
          <p className="text-sm text-muted">+ تأمين مسترد {formatEgp(b.priceSnapshot.deposit)}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <LinkButton href={`/bookings/${b.code}`} variant="secondary">
          تفاصيل الحجز
        </LinkButton>
        <a
          href={`https://wa.me/${wa}?text=${waMsg}`}
          target="_blank"
          rel="noopener noreferrer"
          className="tap inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-lg font-bold bg-[#25D366] text-white"
        >
          <Icon name="whatsapp" className="w-4 h-4 inline-block align-[-3px] me-1.5" />واتساب
        </a>
      </div>
      <LinkButton href="/" variant="ghost" full>
        الرجوع للرئيسية
      </LinkButton>
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
