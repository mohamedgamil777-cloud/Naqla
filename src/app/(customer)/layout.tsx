import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { HeaderBack } from "@/components/HeaderBack";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/Icons";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh max-w-lg mx-auto bg-ground flex flex-col">
      <header className="sticky top-0 z-30 bg-bar text-on-bar shadow-[0_2px_12px_var(--color-bar-edge)]">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-2">
            <HeaderBack />
            <Link href="/" aria-label="نقلة — الرئيسية" className="flex items-center">
              <Logo markClass="h-8" wordClass="text-2xl" surface="bar" caption />
            </Link>
          </div>
          <Link
            href="/bookings"
            aria-label="طلباتي والتنبيهات"
            className="tap w-11 h-11 grid place-items-center rounded-full text-bar-chip-ink hover:bg-bar-chip"
          >
            <Icon name="bell" className="w-6 h-6" />
          </Link>
        </div>
      </header>
      <main className="flex-1 pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
