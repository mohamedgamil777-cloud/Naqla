"use client";
import { usePathname, useRouter } from "next/navigation";

/** Back arrow in the app bar. Hidden on the bottom-nav root tabs (they're top-level
 *  destinations) and on /book (the wizard has its own in-step back). Shown on
 *  sub-pages like vehicle details, a booking, login. */
const ROOTS = ["/", "/bookings", "/help", "/account", "/book"];
export function HeaderBack() {
  const path = usePathname();
  const router = useRouter();
  if (ROOTS.includes(path)) return <span className="w-9" />;
  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="رجوع"
      className="tap w-9 h-9 rounded-full bg-bar-chip text-bar-chip-ink grid place-items-center text-xl font-extrabold shrink-0"
    >
      →
    </button>
  );
}
