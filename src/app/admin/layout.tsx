import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/services/admin-auth";
import { adminLogout } from "@/app/admin-login/actions";

const nav = [
  { href: "/admin", label: "لوحة التحكم", icon: "📊" },
  { href: "/admin/orders", label: "طلبات التوصيل", icon: "📦" },
  { href: "/admin/new-booking", label: "حجز جديد", icon: "➕" },
  { href: "/admin/board", label: "المواعيد", icon: "🗓️" },
  { href: "/admin/bookings", label: "الحجوزات", icon: "📋" },
  { href: "/admin/calculator", label: "حاسبة السعر", icon: "🧮" },
  { href: "/admin/finance", label: "الحسابات", icon: "💰" },
  { href: "/admin/reports", label: "تقارير الشركة", icon: "📈" },
  { href: "/admin/fleet", label: "العربيات", icon: "🚙" },
  { href: "/admin/categories", label: "الأنواع", icon: "🏷️" },
  { href: "/admin/coupons", label: "كوبونات الخصم", icon: "🎟️" },
  { href: "/admin/staff", label: "الموظفين", icon: "👥" },
  { href: "/admin/settings", label: "الإعدادات", icon: "⚙️" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdminAuthed())) redirect("/admin-login");
  return (
    <div className="min-h-dvh md:flex bg-ground">
      <aside className="md:w-60 md:min-h-dvh bg-ink text-white/90 md:sticky md:top-0">
        <div className="px-5 py-4 flex items-center gap-2 font-extrabold text-xl border-b border-white/10">
          <span aria-hidden>🚚</span> نقلة <span className="text-xs font-normal text-white/50">إدارة</span>
        </div>
        <nav className="flex md:flex-col overflow-x-auto md:overflow-visible p-2 gap-1">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex items-center gap-2 px-4 py-3 rounded-xl hover:bg-white/10 font-semibold whitespace-nowrap"
            >
              <span>{n.icon}</span> {n.label}
            </Link>
          ))}
        </nav>
        <div className="px-2 py-2 border-t border-white/10">
          <form action={adminLogout}>
            <button className="w-full flex items-center gap-2 px-4 py-3 rounded-xl hover:bg-white/10 font-semibold text-white/80">
              <span aria-hidden>🚪</span> تسجيل الخروج
            </button>
          </form>
        </div>
        <div className="hidden md:block px-5 py-4 text-xs text-white/40 border-t border-white/10">
          نسخة تجريبية · محمية بكلمة سر
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="p-4 md:p-6 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
