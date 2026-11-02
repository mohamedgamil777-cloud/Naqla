"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/Icons";
import { useTyping } from "@/hooks/useTyping";

const items: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "الرئيسية", icon: "home" },
  { href: "/bookings", label: "طلباتي", icon: "orders" },
  { href: "/help", label: "المساعدة", icon: "help" },
  { href: "/account", label: "حسابي", icon: "user" },
];

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

/** Tablet / desktop: the same destinations as the bottom nav, as plain header links. */
export function HeaderNav() {
  const path = usePathname();
  return (
    <nav className="hidden md:flex items-stretch self-stretch gap-6" aria-label="القائمة الرئيسية">
      {items.map((it) => {
        const active = isActive(path, it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex items-center text-[15px] ${
              active ? "text-ink font-semibold" : "text-muted hover:text-ink"
            }`}
          >
            {it.label}
            {active && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" aria-hidden />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/** Phone: fixed bottom tab bar. */
export function BottomNav() {
  const path = usePathname();
  // slide away while the keyboard is up so it never covers the field being typed in
  const typing = useTyping();
  return (
    <nav
      aria-hidden={typing || undefined}
      className={`md:hidden print:hidden fixed bottom-0 inset-x-0 z-40 bg-panel border-t border-line pb-[env(safe-area-inset-bottom)] transition-transform duration-200 ${
        typing ? "translate-y-full" : ""
      }`}
    >
      <div className="max-w-lg mx-auto grid grid-cols-4">
        {items.map((it) => {
          const active = isActive(path, it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 py-2.5 text-sm ${
                active ? "text-primary font-bold" : "text-muted font-semibold"
              }`}
            >
              <Icon name={it.icon} className="w-6 h-6" strokeWidth={active ? 2.3 : 1.8} />
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
