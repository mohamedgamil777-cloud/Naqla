"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/Icons";

/** Underline tabs at the top of the driver's work list. */
export function DriverTabs({ active, nowCount }: { active: "now" | "upcoming" | "old"; nowCount?: number }) {
  const tabs = [
    { id: "now", href: "/driver", label: `شغلي${nowCount ? ` (${nowCount})` : ""}` },
    { id: "upcoming", href: "/driver?tab=upcoming", label: "القادمة" },
    { id: "old", href: "/driver/history", label: "القديمة" },
  ] as const;
  return (
    <nav className="grid grid-cols-3 border-b border-line -mx-4 px-4">
      {tabs.map((t) => (
        <Link
          key={t.id}
          href={t.href}
          className={`py-3 text-center text-lg border-b-[3px] -mb-px ${
            active === t.id ? "border-primary text-primary font-extrabold" : "border-transparent text-muted font-semibold"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/driver", label: "شغلي", icon: "truck" },
  { href: "/driver/history", label: "القديمة", icon: "clock" },
  { href: "/driver/profile", label: "صفحتي", icon: "user" },
];

/** Bottom navigation for the driver app. */
export function DriverNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-panel border-t border-line pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-lg mx-auto grid grid-cols-3">
        {NAV.map((it) => {
          const active = it.href === "/driver" ? path === "/driver" || path.startsWith("/driver/trip") : path.startsWith(it.href);
          return (
            <Link key={it.href} href={it.href} className={`flex flex-col items-center gap-1 py-2.5 text-sm ${active ? "text-primary font-bold" : "text-muted font-semibold"}`}>
              <Icon name={it.icon} className="w-7 h-7" strokeWidth={active ? 2.3 : 1.8} />
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
