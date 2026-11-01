import Link from "next/link";
import { repo } from "@/data/repo";
import { getSession } from "@/services/session";
import { labelDateArabic, labelTime } from "@/lib/time";
import { DriverTabs } from "@/components/driver/DriverTabs";
import { DriverSwitch } from "@/components/driver/DriverSwitch";
import { LinkButton } from "@/components/ui";
import { Icon } from "@/components/Icons";

export const dynamic = "force-dynamic";

interface HistItem {
  kind: "order" | "trip";
  code: string;
  when: Date;
  title: string;
  sub: string;
  done: boolean; // true = completed, false = cancelled
}

export default async function DriverHistoryPage() {
  const session = await getSession();
  if (!session) {
    return (
      <Centered emoji="🔑" title="سجّل دخولك الأول">
        <LinkButton href="/login?next=/driver/history" full>الدخول</LinkButton>
      </Centered>
    );
  }
  const driver = await repo.getStaffByPhone(session.phone);
  if (!driver || driver.role !== "driver") {
    return <Centered emoji="🚫" title="الصفحة دي للسواقين بس" />;
  }

  const orders = await repo.listDeliveryOrdersByDriver(driver.id);

  const items: HistItem[] = orders
    .filter((o) => o.status === "completed" || o.status === "cancelled")
    .map((o) => ({
      kind: "order" as const,
      code: o.code,
      when: o.scheduledAt,
      title: `${o.sizeName}${o.sizeCode ? ` · ${o.sizeCode}` : ""}`,
      sub: `${o.pickupAddress || "من الخريطة"} ← ${o.dropoffAddress || "للخريطة"}`,
      done: o.status === "completed",
    }))
    .sort((a, b) => b.when.getTime() - a.when.getTime());

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-2xl font-extrabold">الرحلات القديمة</h1>
        <DriverSwitch label="خروج" subtle />
      </div>
      <DriverTabs active="old" />

      {items.length === 0 ? (
        <div className="bg-panel border border-line rounded-card p-8 text-center">
          <div className="text-5xl mb-3">🗂️</div>
          <p className="text-lg font-bold">لسه مفيش رحلات قديمة</p>
          <p className="text-muted mt-1">اللي بتخلّصه هيظهر هنا.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((it) => {
            const card = (
              <div className="bg-panel border border-line rounded-card p-4 flex items-center gap-3">
                <span className={`w-11 h-11 shrink-0 rounded-full grid place-items-center ${it.done ? "bg-ok-soft text-ok" : "bg-booked-soft text-booked"}`} aria-hidden>
                  <Icon name={it.done ? "checkCircle" : "xCircle"} className="w-6 h-6" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold">{it.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${it.done ? "bg-ok-soft text-ok" : "bg-booked-soft text-booked"}`}>
                      {it.done ? "تمّت" : "ملغية"}
                    </span>
                  </div>
                  <div className="text-sm text-muted truncate">{it.sub}</div>
                  <div className="text-xs text-ink-2 mt-0.5">{labelDateArabic(it.when)} — {labelTime(it.when)}</div>
                </div>
                {it.kind === "order" && <Icon name="chevronLeft" className="w-5 h-5 text-muted" />}
              </div>
            );
            return it.kind === "order" ? (
              <Link key={`o-${it.code}`} href={`/driver/trip/${it.code}`} className="tap">{card}</Link>
            ) : (
              <div key={`t-${it.code}`}>{card}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Centered({ emoji, title, children }: { emoji: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="p-6 min-h-[60vh] flex flex-col items-center justify-center text-center gap-3">
      <div className="text-6xl">{emoji}</div>
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <div className="flex flex-col gap-3 w-full max-w-xs">{children}</div>
    </div>
  );
}
