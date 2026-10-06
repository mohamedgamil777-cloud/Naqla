import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/services/admin-auth";
import { AdminLoginForm } from "./AdminLoginForm";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await isAdminAuthed()) redirect("/admin");
  return (
    <div className="min-h-dvh grid place-items-center bg-ground p-6" dir="rtl">
      <div className="w-full max-w-sm bg-panel border border-line rounded-card p-6 shadow-sm flex flex-col gap-4">
        <div className="text-center">
          <Logo className="text-emph" markClass="h-10" wordClass="text-4xl" caption />
          <h1 className="text-2xl font-extrabold mt-4">🔒 دخول الإدارة</h1>
          <p className="text-muted text-sm mt-1">اكتب كلمة السر عشان تدخل لوحة التحكم.</p>
        </div>
        <AdminLoginForm />
        <p className="text-center text-sm text-muted">
          موظف؟ <a href="/login?next=/admin" className="text-primary font-bold">ادخل برقم موبايلك</a>
        </p>
      </div>
    </div>
  );
}
