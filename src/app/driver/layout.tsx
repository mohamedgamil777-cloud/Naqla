import { LogoMark } from "@/components/Logo";

export const metadata = { title: "رحلاتي — نقلة" };

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh max-w-lg mx-auto bg-ground flex flex-col">
      <header className="sticky top-0 z-30 bg-bar text-on-bar shadow-[0_2px_12px_var(--color-bar-edge)]">
        <div className="flex items-center justify-center px-4 h-16">
          <span className="flex items-center gap-2 font-extrabold text-2xl">
            <LogoMark className="h-7" surface="bar" /> رحلاتي
          </span>
        </div>
      </header>
      <main className="flex-1 pb-10">{children}</main>
    </div>
  );
}
