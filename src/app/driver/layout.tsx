export const metadata = { title: "رحلاتي — نقلة" };

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh max-w-lg mx-auto bg-ground flex flex-col">
      <header className="sticky top-0 z-30 bg-primary text-white">
        <div className="flex items-center justify-center px-4 h-16">
          <span className="flex items-center gap-2 font-extrabold text-2xl">
            <span aria-hidden>🧑‍✈️</span> رحلاتي
          </span>
        </div>
      </header>
      <main className="flex-1 pb-10">{children}</main>
    </div>
  );
}
