import Link from "next/link";
import { repo } from "@/data/repo";
import { getSession } from "@/services/session";
import { formatEgp } from "@/lib/money";
import { labelDateArabic, labelTime } from "@/lib/time";
import { durationLabel } from "@/lib/client-time";
import { BookingStatusBadge, EmptyState, LinkButton } from "@/components/ui";
import type { BookingDTO } from "@/data/types";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const session = await getSession();
  if (!session) {
    return (
      <EmptyState
        title="لسه مفيش حجوزات"
        subtitle="سجّل دخولك برقم موبايلك عشان تشوف حجوزاتك"
        action={<LinkButton href="/login">دخول برقم الموبايل</LinkButton>}
      />
    );
  }

  const list = await repo.listBookingsByPhone(session.phone);
  if (list.length === 0) {
    return (
      <EmptyState
        title="لسه مفيش حجوزات"
        subtitle="احجز عربيتك الأولى بسهولة"
        action={<LinkButton href="/" variant="accent">احجز الآن</LinkButton>}
      />
    );
  }

  const now = Date.now();
  const cancelled = list.filter((b) => b.status === "cancelled");
  const current = list.filter(
    (b) => b.status !== "cancelled" && b.startsAt.getTime() <= now && b.endsAt.getTime() > now
  );
  const upcoming = list.filter(
    (b) => b.status !== "cancelled" && b.status !== "completed" && b.startsAt.getTime() > now
  );
  const past = list.filter(
    (b) => b.status === "completed" || (b.status !== "cancelled" && b.endsAt.getTime() <= now)
  );

  return (
    <div className="p-4 flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold">حجوزاتي</h1>
      <Section title="الحالية" items={current} />
      <Section title="القادمة" items={upcoming} />
      <Section title="السابقة" items={past} />
      <Section title="الملغاة" items={cancelled} />
    </div>
  );
}

function Section({ title, items }: { title: string; items: BookingDTO[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="font-extrabold text-lg mb-3 text-ink-2">{title}</h2>
      <div className="flex flex-col gap-3">
        {items.map((b) => (
          <Link
            key={b.code}
            href={`/bookings/${b.code}`}
            className="block bg-panel border border-line rounded-card p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-extrabold text-lg">{b.vehicleName}</div>
                <div className="text-muted text-sm mt-0.5">حجز #{b.code}</div>
              </div>
              <BookingStatusBadge status={b.status} />
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-ink-2">
                {labelDateArabic(b.startsAt)} — {labelTime(b.startsAt)} · {durationLabel(b.hours)}
              </span>
              <span className="font-bold text-primary">{formatEgp(b.priceSnapshot.total)}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
