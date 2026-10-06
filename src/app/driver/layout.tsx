import Link from "next/link";
import { Logo } from "@/components/Logo";
import { DriverNav } from "@/components/driver/DriverTabs";

export const metadata = { title: "شغلي — نقلة" };

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh max-w-lg mx-auto bg-ground flex flex-col">
      <header className="sticky top-0 z-30 bg-bar text-on-bar shadow-[0_2px_12px_var(--color-bar-edge)]">
        <div className="flex items-center justify-between px-4 h-16">
          <Link href="/driver" aria-label="شغلي">
            <Logo className="h-11" surface="bar" />
          </Link>
          <span className="rounded-full bg-primary-soft text-primary-ink px-3 py-1 text-sm font-bold">تطبيق السواق</span>
        </div>
      </header>
      <main className="flex-1 pb-28">{children}</main>
      <DriverNav />
    </div>
  );
}
