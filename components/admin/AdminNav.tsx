"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { adminLogout } from "@/actions/admin-auth";
import { Logo } from "@/components/Logo";
import { Icon, type IconName } from "@/components/Icons";

export type AdminNavItem = { href: string; label: string; icon: IconName; group: string };

function isActive(path: string, href: string) {
  return href === "/admin" ? path === "/admin" : path === href || path.startsWith(`${href}/`);
}

/** Desktop: fixed sidebar. Phone / tablet: top bar whose menu button slides the same list in. */
export function AdminNav({ items, roleLabel }: { items: AdminNavItem[]; roleLabel: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden"; // the page behind the menu shouldn't scroll
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="lg:hidden print:hidden sticky top-0 z-40 bg-panel border-b border-line h-14 px-3 flex items-center justify-between">
        <Brand />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="admin-menu"
          aria-label="القائمة"
          className="w-11 h-11 grid place-items-center rounded-lg text-ink cursor-pointer hover:bg-panel-2"
        >
          <Icon name="menu" className="w-6 h-6" />
        </button>
      </header>

      <div
        className={`lg:hidden print:hidden fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
        />
        <div
          id="admin-menu"
          role="dialog"
          aria-modal="true"
          aria-label="القائمة"
          inert={!open}
          className={`absolute inset-y-0 start-0 w-72 max-w-[85vw] bg-panel flex flex-col transition-transform duration-200 ${
            open ? "translate-x-0 shadow-2xl" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between pe-2 border-b border-line">
            <div className="px-5 py-4">
              <Brand />
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="اقفل القائمة"
              className="w-11 h-11 grid place-items-center rounded-lg text-ink cursor-pointer hover:bg-panel-2"
            >
              <Icon name="close" className="w-6 h-6" />
            </button>
          </div>
          <MenuBody items={items} roleLabel={roleLabel} onNavigate={() => setOpen(false)} />
        </div>
      </div>

      <aside className="hidden lg:flex flex-col w-60 shrink-0 sticky top-0 h-dvh bg-panel border-e border-line print:hidden">
        <div className="px-5 h-16 flex items-center border-b border-line">
          <Brand />
        </div>
        <MenuBody items={items} roleLabel={roleLabel} />
      </aside>
    </>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <Logo className="h-9" surface="bar" />
      <span className="text-xs font-medium text-muted border border-line-2 rounded-md px-1.5 py-0.5">
        إدارة
      </span>
    </div>
  );
}

function MenuBody({
  items,
  roleLabel,
  onNavigate,
}: {
  items: AdminNavItem[];
  roleLabel: string;
  onNavigate?: () => void;
}) {
  const path = usePathname();
  const groups = [...new Set(items.map((n) => n.group))];
  return (
    <>
      <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-4" aria-label="أقسام الإدارة">
        {groups.map((g) => (
          <div key={g}>
            <div className="px-3 pb-1 text-[11px] font-semibold text-muted">{g}</div>
            <ul className="flex flex-col gap-px">
              {items
                .filter((n) => n.group === g)
                .map((n) => {
                  const active = isActive(path, n.href);
                  return (
                    <li key={n.href}>
                      <Link
                        href={n.href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={`relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[14px] whitespace-nowrap ${
                          active
                            ? "bg-primary-soft text-primary-ink font-semibold"
                            : "text-ink-2 hover:bg-panel-2 hover:text-ink"
                        }`}
                      >
                        {active && (
                          <span
                            className="absolute start-0 inset-y-2 w-0.5 rounded-full bg-primary"
                            aria-hidden
                          />
                        )}
                        <Icon
                          name={n.icon}
                          className="w-[18px] h-[18px] shrink-0"
                          strokeWidth={active ? 2.1 : 1.8}
                        />
                        {n.label}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="px-3 py-3 border-t border-line flex items-center justify-between gap-2">
        <span className="px-3 text-xs text-muted">{roleLabel}</span>
        <form action={adminLogout}>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-booked cursor-pointer hover:bg-booked-soft">
            <Icon name="logOut" className="w-4 h-4" /> خروج
          </button>
        </form>
      </div>
    </>
  );
}
