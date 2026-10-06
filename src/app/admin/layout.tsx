import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminRole } from "@/services/admin-auth";
import { adminLogout } from "@/app/admin-login/actions";
import type { StaffRole } from "@/data/types";
import { Logo } from "@/components/Logo";

const ROLE_LABEL: Record<StaffRole, string> = {
  super_admin: "مدير عام",
  fleet_mgr: "مدير أسطول",
  agent: "موظف حجوزات",
  finance: "حسابات",
  driver: "سائق",
};

// Which roles may see each nav item (super_admin sees everything).
const nav: { href: string; label: string; icon: string; roles: StaffRole[] }[] = [
  { href: "/admin", label: "لوحة التحكم", icon: "📊", roles: ["super_admin", "fleet_mgr", "agent", "finance"] },
  { href: "/admin/orders", label: "طلبات التوصيل", icon: "📦", roles: ["super_admin", "fleet_mgr", "agent"] },
  { href: "/admin/new-booking", label: "حجز جديد", icon: "➕", roles: ["super_admin", "agent"] },
  { href: "/admin/board", label: "المواعيد", icon: "🗓️", roles: ["super_admin", "fleet_mgr", "agent"] },
  { href: "/admin/bookings", label: "الحجوزات", icon: "📋", roles: ["super_admin", "fleet_mgr", "agent"] },
  { href: "/admin/calculator", label: "حاسبة السعر", icon: "🧮", roles: ["super_admin", "agent"] },
  { href: "/admin/finance", label: "الحسابات", icon: "💰", roles: ["super_admin", "finance"] },
  { href: "/admin/settlements", label: "تسديدات السواقين", icon: "💵", roles: ["super_admin", "finance"] },
  { href: "/admin/expenses", label: "النثريات", icon: "🧾", roles: ["super_admin", "finance"] },
  { href: "/admin/reports", label: "تقارير الشركة", icon: "📈", roles: ["super_admin", "finance"] },
  { href: "/admin/fleet", label: "العربيات", icon: "🚙", roles: ["super_admin", "fleet_mgr"] },
  { href: "/admin/categories", label: "الأنواع", icon: "🏷️", roles: ["super_admin", "fleet_mgr"] },
  { href: "/admin/coupons", label: "كوبونات الخصم", icon: "🎟️", roles: ["super_admin", "agent"] },
  { href: "/admin/staff", label: "الموظفين", icon: "👥", roles: ["super_admin"] },
  { href: "/admin/settings", label: "الإعدادات", icon: "⚙️", roles: ["super_admin"] },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const role = await getAdminRole();
  if (!role) redirect("/admin-login");
  const items = nav.filter((n) => n.roles.includes(role));
  return (
    <div className="min-h-dvh md:flex bg-ground">
      <aside className="md:w-60 md:min-h-dvh bg-bar-ink text-white/90 md:sticky md:top-0">
        <div className="px-5 py-4 flex items-center gap-2 font-extrabold text-xl border-b border-white/10">
          <Logo markClass="h-7" wordClass="text-2xl" surface="dark" /> <span className="text-xs font-normal text-white/60 bg-white/10 rounded-full px-2 py-0.5">إدارة</span>
        </div>
        <nav className="flex md:flex-col overflow-x-auto md:overflow-visible p-2 gap-1">
          {items.map((n) => (
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
          الصلاحية: {ROLE_LABEL[role]}
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="p-4 md:p-6 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
