"use client";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";

/** Back arrow in the app bar. Hidden on the bottom-nav root tabs (they're top-level
 *  destinations) and on /book (the wizard has its own in-step back). Shown on
 *  sub-pages like vehicle details, a booking, login. Phones only: from tablet up the browser's back does this. */
const ROOTS = ["/", "/bookings", "/help", "/account", "/book"];
export function HeaderBack() {
  const path = usePathname();
  const router = useRouter();
  if (ROOTS.includes(path)) return null;
  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="رجوع"
      className="md:hidden tap w-10 h-10 -ms-2 rounded-full text-ink grid place-items-center shrink-0 hover:bg-panel-2"
    >
      <Icon name="arrowLeft" className="w-5 h-5 -scale-x-100" strokeWidth={2.2} />
    </button>
  );
}
