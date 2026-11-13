import { redirect } from "next/navigation";
import { getAdminRole } from "@/services/admin-auth";
import { can, type Permission } from "@/lib/permissions";
import type { StaffRole } from "@/types";
import { AdminNav, type AdminNavItem } from "@/components/admin/AdminNav";

const ROLE_LABEL: Record<StaffRole, string> = {
  super_admin: "مدير عام",
  fleet_mgr: "مدير أسطول",
  agent: "موظف حجوزات",
  finance: "حسابات",
  driver: "سائق",
};

// Each menu item shows only for roles holding its permission (lib/permissions.ts).
// Hiding is feedback only: every page also checks its permission on the server.
const nav: (AdminNavItem & { permission: Permission })[] = [
  { group: "العمليات", href: "/admin", label: "لوحة التحكم", icon: "dashboard", permission: "dashboard:read" },
  { group: "العمليات", href: "/admin/orders", label: "طلبات التوصيل", icon: "box", permission: "delivery:read" },
  { group: "العمليات", href: "/admin/new-order", label: "طلب بالتليفون", icon: "phone", permission: "delivery:create" },
  { group: "العمليات", href: "/admin/new-booking", label: "حجز جديد", icon: "plus", permission: "booking:create" },
  { group: "العمليات", href: "/admin/board", label: "المواعيد", icon: "calendar", permission: "booking:read" },
  { group: "العمليات", href: "/admin/bookings", label: "الحجوزات", icon: "orders", permission: "booking:read" },
  { group: "العمليات", href: "/admin/calculator", label: "حاسبة السعر", icon: "calculator", permission: "pricing:calculate" },
  { group: "العملاء", href: "/admin/companies", label: "الشركات", icon: "building", permission: "company:manage" },
  { group: "العملاء", href: "/admin/customers", label: "العملاء", icon: "user", permission: "customer:manage" },
  { group: "العملاء", href: "/admin/coupons", label: "كوبونات الخصم", icon: "ticket", permission: "coupon:manage" },
  { group: "الحسابات", href: "/admin/finance", label: "الحسابات", icon: "coins", permission: "finance:read" },
  { group: "الحسابات", href: "/admin/settlements", label: "تسديدات السواقين", icon: "banknote", permission: "payout:manage" },
  { group: "الحسابات", href: "/admin/expenses", label: "النثريات", icon: "receipt", permission: "expense:manage" },
  { group: "الحسابات", href: "/admin/reports", label: "تقارير الشركة", icon: "trendingUp", permission: "report:read" },
  { group: "الأسطول والإعدادات", href: "/admin/fleet", label: "الأسطول المتاح", icon: "truck", permission: "fleet:manage" },
  { group: "الأسطول والإعدادات", href: "/admin/categories", label: "الأنواع", icon: "tag", permission: "category:manage" },
  { group: "الأسطول والإعدادات", href: "/admin/content", label: "محتوى الموقع", icon: "image", permission: "content:manage" },
  { group: "الأسطول والإعدادات", href: "/admin/staff", label: "الموظفين", icon: "users", permission: "staff:manage" },
  { group: "الأسطول والإعدادات", href: "/admin/settings", label: "الإعدادات", icon: "settings", permission: "settings:manage" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const role = await getAdminRole();
  if (!role) redirect("/admin-login");
  const items = nav.filter((n) => can(role, n.permission));
  return (
    <div className="min-h-dvh lg:flex bg-ground">
      <AdminNav items={items} roleLabel={ROLE_LABEL[role]} />
      <main className="flex-1 min-w-0">
        <div className="p-4 md:p-6 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
