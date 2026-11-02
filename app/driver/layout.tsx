import Link from "next/link";
import { Logo } from "@/components/Logo";
import { DriverHeaderNav, DriverNav } from "@/components/driver/DriverTabs";

export const metadata = { title: "شغلي — انقلي" };

/** Phone: app bar + bottom tabs. Tablet / desktop: tabs in the header, content in a centred column. */
export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-ground flex flex-col">
      <header className="sticky top-0 z-30 bg-bar/95 backdrop-blur text-on-bar border-b border-line">
        <div className="max-w-3xl mx-auto flex items-center gap-8 px-4 h-16">
          <Link href="/driver" aria-label="شغلي">
            <Logo className="h-10" surface="bar" />
          </Link>
          <DriverHeaderNav />
          <span className="md:hidden ms-auto rounded-full bg-primary-soft text-primary-ink px-3 py-1 text-sm font-bold">
            بوابة السواق
          </span>
        </div>
      </header>
      <main className="flex-1 w-full max-w-3xl mx-auto pb-28 md:pt-4 md:pb-16">{children}</main>
      <DriverNav />
    </div>
  );
}
