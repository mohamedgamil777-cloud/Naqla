import Link from "next/link";
import { BottomNav, HeaderNav } from "@/components/CustomerNav";
import { HeaderBack } from "@/components/HeaderBack";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/Icons";

/** Phone: app bar + bottom tabs. Tablet / desktop: one header with the tabs inline, content centred. */
export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-ground flex flex-col">
      <header className="print:hidden sticky top-0 z-30 bg-bar/90 backdrop-blur text-on-bar border-b border-line/70">
        <div className="max-w-6xl mx-auto flex items-center gap-10 px-4 md:px-6 h-16 md:h-[4.5rem]">
          <div className="flex items-center gap-2">
            <HeaderBack />
            <Link href="/" aria-label="انقلي ENQELLY — الرئيسية" className="flex items-center">
              <Logo className="h-10 md:h-12" surface="bar" />
            </Link>
          </div>
          <HeaderNav />
          <div className="ms-auto flex items-center gap-2">
            <Link
              href="/bookings"
              className="hidden md:inline-flex items-center gap-2 rounded-full border-2 border-primary/80 text-primary px-4 py-1.5 font-bold text-sm hover:bg-primary-soft"
            >
              <Icon name="orders" className="w-4 h-4" strokeWidth={2.2} />
              طلباتي
            </Link>
            <Link
              href="/account"
              aria-label="حسابي"
              className="hidden md:grid w-10 h-10 place-items-center rounded-full text-primary hover:bg-primary-soft"
            >
              <Icon name="user" className="w-5 h-5" strokeWidth={2} />
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
