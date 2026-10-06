"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/Icons";
import { useTyping } from "@/lib/useTyping";

const items: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "الرئيسية", icon: "home" },
  { href: "/bookings", label: "طلباتي", icon: "orders" },
  { href: "/help", label: "المساعدة", icon: "help" },
  { href: "/account", label: "حسابي", icon: "user" },
];

export function BottomNav() {
  const path = usePathname();
  // slide away while the keyboard is up so it never covers the field being typed in
  const typing = useTyping();
  return (
    <nav
      aria-hidden={typing || undefined}
      className={`fixed bottom-0 inset-x-0 z-40 bg-panel border-t border-line pb-[env(safe-area-inset-bottom)] transition-transform duration-200 ${
        typing ? "translate-y-full" : ""
      }`}
    >
      <div className="max-w-lg mx-auto grid grid-cols-4">
        {items.map((it) => {
          const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
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
