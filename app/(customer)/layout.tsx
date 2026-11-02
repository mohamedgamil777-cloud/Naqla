import Link from "next/link";
import { BottomNav, HeaderNav } from "@/components/CustomerNav";
import { HeaderBack } from "@/components/HeaderBack";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/Icons";

/** Phone: app bar + bottom tabs. Tablet / desktop: one header with the tabs inline, content centred. */
export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-ground flex flex-col">
      <header className="print:hidden sticky top-0 z-30 bg-bar/95 backdrop-blur text-on-bar border-b border-line">
        <div className="max-w-6xl mx-auto flex items-center gap-8 px-4 md:px-6 h-16">
          <div className="flex items-center gap-2">
            <HeaderBack />
            <Link href="/" aria-label="انقلي — الرئيسية" className="flex items-center">
              <Logo className="h-10" surface="bar" />
            </Link>
          </div>
          <HeaderNav />
          <div className="ms-auto flex items-center gap-2">
            <Link
              href="/estimate"
              className="hidden md:inline-flex items-center gap-1.5 rounded-xl bg-accent text-on-accent px-4 py-2 font-semibold hover:brightness-95"
            >
              اطلب توصيلة
            </Link>
            <Link
              href="/bookings"
              aria-label="طلباتي والتنبيهات"
              className="md:hidden tap w-11 h-11 grid place-items-center rounded-full text-bar-chip-ink hover:bg-bar-chip"
            >
              <Icon name="bell" className="w-6 h-6" />
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full max-w-6xl mx-auto pb-24 md:px-2 md:pb-16">{children}</main>
      <footer className="hidden md:block print:hidden border-t border-line bg-panel">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between gap-4 text-sm text-muted">
          <span>© {new Date().getFullYear()} انقلي — نقل أغراضك بسهولة</span>
          <nav className="flex items-center gap-5 font-semibold">
            <Link href="/estimate" className="hover:text-primary">
              اطلب توصيلة
            </Link>
            <Link href="/help" className="hover:text-primary">
              المساعدة
            </Link>
            <Link href="/account" className="hover:text-primary">
              حسابي
            </Link>
          </nav>
        </div>
      </footer>
      <BottomNav />
    </div>
  );
}
