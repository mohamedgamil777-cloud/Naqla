import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/services/admin-auth";
import { adminPasscode } from "@/lib/env";
import { AdminLoginForm } from "./AdminLoginForm";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await isAdminAuthed()) redirect("/admin");
  return (
    <div className="min-h-dvh grid place-items-center bg-ground p-6" dir="rtl">
      <div className="w-full max-w-sm bg-panel border border-line rounded-card p-6 flex flex-col gap-4">
        <div className="text-center">
          <Logo className="h-20 mx-auto" full />
          <h1 className="text-2xl font-extrabold mt-4"><Icon name="lock" className="w-4 h-4 inline-block align-[-3px] me-1.5" />دخول الإدارة</h1>
          <p className="text-muted text-sm mt-1">ادخل برقم موبايلك وكلمة السر بتاعتك.</p>
        </div>
        <AdminLoginForm passcodeEnabled={!!adminPasscode()} />
      </div>
    </div>
  );
}
