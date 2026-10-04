import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { HeaderBack } from "@/components/HeaderBack";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh max-w-lg mx-auto bg-ground flex flex-col">
      <header className="sticky top-0 z-30 bg-primary text-white">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <HeaderBack />
            <Link href="/" className="flex items-center gap-2 font-extrabold text-xl">
              <span aria-hidden>🚚</span> نقلة
            </Link>
          </div>
          <Link href="/help" className="text-sm font-semibold bg-white/15 rounded-full px-3 py-1.5">
            محتاج مساعدة؟
          </Link>
        </div>
      </header>
      <main className="flex-1 pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
