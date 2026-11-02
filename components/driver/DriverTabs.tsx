"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/Icons";
import { useTyping } from "@/hooks/useTyping";

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

function isActive(path: string, href: string) {
  return href === "/driver" ? path === "/driver" || path.startsWith("/driver/trip") : path.startsWith(href);
}

/** Tablet / desktop: the bottom-nav destinations as plain header links. */
export function DriverHeaderNav() {
  const path = usePathname();
  return (
    <nav className="hidden md:flex items-stretch self-stretch gap-6" aria-label="القائمة">
      {NAV.map((it) => {
        const active = isActive(path, it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex items-center text-[15px] ${active ? "text-ink font-semibold" : "text-muted hover:text-ink"}`}
          >
            {it.label}
            {active && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" aria-hidden />}
          </Link>
        );
      })}
    </nav>
  );
}

/** Phone: bottom navigation for the driver pages. */
export function DriverNav() {
  const path = usePathname();
  // slide away while the keyboard is up so it never covers the field being typed in
  const typing = useTyping();
  return (
    <nav
      aria-hidden={typing || undefined}
      className={`md:hidden fixed bottom-0 inset-x-0 z-40 bg-panel border-t border-line pb-[env(safe-area-inset-bottom)] transition-transform duration-200 ${
        typing ? "translate-y-full" : ""
      }`}
    >
      <div className="max-w-lg mx-auto grid grid-cols-3">
        {NAV.map((it) => {
          const active = isActive(path, it.href);
          return (
            <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined} className={`flex flex-col items-center gap-1 py-2.5 text-sm ${active ? "text-primary font-bold" : "text-muted font-semibold"}`}>
              <Icon name={it.icon} className="w-7 h-7" strokeWidth={active ? 2.3 : 1.8} />
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
