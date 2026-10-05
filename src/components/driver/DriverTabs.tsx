import Link from "next/link";

/** Tabs for the driver app: current work, old trips, my profile. */
export function DriverTabs({ active }: { active: "now" | "old" | "profile" }) {
  const base = "flex-1 rounded-2xl py-2.5 text-center font-extrabold tap border-2 text-sm";
  const on = "border-primary bg-primary-soft text-primary-ink";
  const off = "border-line-2 bg-panel text-ink-2";
  return (
    <div className="grid grid-cols-3 gap-2">
      <Link href="/driver" className={`${base} ${active === "now" ? on : off}`}>🚚 شغلي</Link>
      <Link href="/driver/history" className={`${base} ${active === "old" ? on : off}`}>🕓 القديمة</Link>
      <Link href="/driver/profile" className={`${base} ${active === "profile" ? on : off}`}>👤 صفحتي</Link>
    </div>
  );
}
