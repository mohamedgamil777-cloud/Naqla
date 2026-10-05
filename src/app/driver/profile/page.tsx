import { repo } from "@/data/repo";
import { getSession } from "@/services/session";
import { formatEgp } from "@/lib/money";
import { labelDateArabic } from "@/lib/time";
import { DriverTabs } from "@/components/driver/DriverTabs";
import { DriverSwitch } from "@/components/driver/DriverSwitch";
import { LinkButton } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DriverProfilePage() {
  const session = await getSession();
  if (!session) {
    return (
      <Centered emoji="🔑" title="سجّل دخولك الأول">
        <LinkButton href="/login?next=/driver/profile" full>الدخول</LinkButton>
      </Centered>
    );
  }
  const driver = await repo.getStaffByPhone(session.phone);
  if (!driver || driver.role !== "driver") {
    return <Centered emoji="🚫" title="الصفحة دي للسواقين بس" />;
  }

  const orders = await repo.listDeliveryOrdersByDriver(driver.id);
  const completed = orders.filter((o) => o.status === "completed");
  const totalEarned = completed.reduce((s, o) => s + (o.driverFee || 0), 0);
  const activeCount = orders.filter((o) => o.status === "assigned" || o.status === "en_route").length;
  const firstName = (driver.name || "").split(" ")[0] || "يا كابتن";

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-2xl font-extrabold">👤 صفحتي</h1>
        <DriverSwitch label="خروج" subtle />
      </div>
      <DriverTabs active="profile" />

      {/* Earnings */}
      <div className="bg-primary text-white rounded-card p-5 shadow-sm">
        <div className="text-sm font-bold opacity-90">💵 إجمالي أرباحي</div>
        <div className="text-4xl font-extrabold mt-1">{formatEgp(totalEarned)}</div>
        <div className="flex gap-4 mt-3 text-sm">
          <span className="bg-white/15 rounded-xl px-3 py-1.5 font-bold">✅ {completed.length} توصيلة مكتملة</span>
          <span className="bg-white/15 rounded-xl px-3 py-1.5 font-bold">🚚 {activeCount} شغل حالي</span>
        </div>
        <p className="text-xs opacity-80 mt-2">الأرباح بتتحسب حسب الأجر المتفق عليه لكل توصيلة.</p>
      </div>

      {/* Info */}
      <div className="bg-panel border border-line rounded-card p-4 flex flex-col gap-2">
        <h2 className="font-extrabold">بياناتي</h2>
        <Row k="الاسم" v={driver.name || "-"} />
        <Row k="الموبايل" v={driver.phone} ltr />
        <Row k="الصفة" v="سائق" />
        <Row k="طريقة الدخول" v="برقم الموبايل (كود تحقق)" />
      </div>

      {/* Documents placeholder (Order B) */}
      <div className="bg-panel border border-line rounded-card p-4">
        <h2 className="font-extrabold mb-1">مستنداتي</h2>
        <p className="text-muted text-sm">رخصة القيادة، رخصة العربية، البطاقة، والصور — هتتفعّل قريباً مع صفحة التسجيل.</p>
      </div>

      {/* Recent completed deliveries */}
      {completed.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-extrabold">آخر التوصيلات</h2>
          {completed.slice(0, 10).map((o) => (
            <div key={o.code} className="bg-panel border border-line rounded-card p-3 flex items-center justify-between">
              <div className="min-w-0">
                <div className="font-bold text-sm truncate">#{o.code} · {o.sizeName}</div>
                <div className="text-xs text-muted truncate">{o.pickupAddress || "من الخريطة"} ← {o.dropoffAddress || "للخريطة"}</div>
                <div className="text-xs text-ink-2">{labelDateArabic(o.scheduledAt)}</div>
              </div>
              <span className="font-extrabold text-primary whitespace-nowrap">{formatEgp(o.driverFee || 0)}</span>
            </div>
          ))}
        </div>
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

function Centered({ emoji, title, children }: { emoji: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="p-6 min-h-[60vh] flex flex-col items-center justify-center text-center gap-3">
      <div className="text-6xl">{emoji}</div>
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <div className="flex flex-col gap-3 w-full max-w-xs">{children}</div>
    </div>
  );
}
