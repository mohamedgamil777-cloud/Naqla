import { adminLogout } from "@/actions/admin-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminRole } from "@/services/admin-auth";
import { can, type Permission } from "@/lib/permissions";
import type { StaffRole } from "@/types";
import { Logo } from "@/components/Logo";

const ROLE_LABEL: Record<StaffRole, string> = {
  super_admin: "مدير عام",
  fleet_mgr: "مدير أسطول",
  agent: "موظف حجوزات",
  finance: "حسابات",
  driver: "سائق",
};

// Each menu item shows only for roles holding its permission (lib/permissions.ts).
// Hiding is feedback only: every page also checks its permission on the server.
const nav: { href: string; label: string; icon: string; permission: Permission }[] = [
  { href: "/admin", label: "لوحة التحكم", icon: "📊", permission: "dashboard:read" },
  { href: "/admin/orders", label: "طلبات التوصيل", icon: "📦", permission: "delivery:read" },
  { href: "/admin/new-order", label: "طلب بالتليفون", icon: "☎️", permission: "delivery:create" },
  { href: "/admin/new-booking", label: "حجز جديد", icon: "➕", permission: "booking:create" },
  { href: "/admin/board", label: "المواعيد", icon: "🗓️", permission: "booking:read" },
  { href: "/admin/bookings", label: "الحجوزات", icon: "📋", permission: "booking:read" },
  { href: "/admin/calculator", label: "حاسبة السعر", icon: "🧮", permission: "pricing:calculate" },
  { href: "/admin/companies", label: "الشركات", icon: "🏢", permission: "company:manage" },
  { href: "/admin/finance", label: "الحسابات", icon: "💰", permission: "finance:read" },
  { href: "/admin/settlements", label: "تسديدات السواقين", icon: "💵", permission: "payout:manage" },
  { href: "/admin/expenses", label: "النثريات", icon: "🧾", permission: "expense:manage" },
  { href: "/admin/reports", label: "تقارير الشركة", icon: "📈", permission: "report:read" },
  { href: "/admin/fleet", label: "العربيات", icon: "🚙", permission: "fleet:manage" },
  { href: "/admin/categories", label: "الأنواع", icon: "🏷️", permission: "category:manage" },
  { href: "/admin/customers", label: "العملاء", icon: "👤", permission: "customer:manage" },
  { href: "/admin/coupons", label: "كوبونات الخصم", icon: "🎟️", permission: "coupon:manage" },
  { href: "/admin/content", label: "محتوى التطبيق", icon: "🖼️", permission: "content:manage" },
  { href: "/admin/staff", label: "الموظفين", icon: "👥", permission: "staff:manage" },
  { href: "/admin/settings", label: "الإعدادات", icon: "⚙️", permission: "settings:manage" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const role = await getAdminRole();
  if (!role) redirect("/admin-login");
  const items = nav.filter((n) => can(role, n.permission));
  return (
    <div className="min-h-dvh md:flex bg-ground">
      <aside className="md:w-60 md:min-h-dvh bg-bar-ink text-white/90 md:sticky md:top-0 print:hidden">
        <div className="px-5 py-4 flex items-center gap-2 font-extrabold text-xl border-b border-white/10">
          <Logo className="h-9" surface="dark" />{" "}
          <span className="text-xs font-normal text-white/60 bg-white/10 rounded-full px-2 py-0.5">
            إدارة
          </span>
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
