import Link from "next/link";

/** Two-tab switch for the driver: current work vs. old trips. */
export function DriverTabs({ active }: { active: "now" | "old" }) {
  const base = "flex-1 rounded-2xl py-3 text-center font-extrabold tap border-2";
  const on = "border-primary bg-primary-soft text-primary-ink";
  const off = "border-line-2 bg-panel text-ink-2";
  return (
    <div className="grid grid-cols-2 gap-2">
      <Link href="/driver" className={`${base} ${active === "now" ? on : off}`}>🚚 الشغل الحالي</Link>
      <Link href="/driver/history" className={`${base} ${active === "old" ? on : off}`}>🕓 الرحلات القديمة</Link>
    </div>
  );
}
