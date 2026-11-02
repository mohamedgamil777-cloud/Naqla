"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/Icons";
import { AuthForm, type AuthMode } from "@/components/AuthForm";

/** Phone + password for everyone (customers, drivers). New customers create an account here. */
export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");

  function done() {
    const next = new URLSearchParams(window.location.search).get("next");
    router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/bookings");
    router.refresh();
  }

  return (
    <div className="p-4 pt-8 md:pt-12 flex flex-col gap-6 w-full max-w-md mx-auto">
      <header className="flex flex-col items-center text-center gap-3">
        <Logo className="h-16" full />
        <div>
          <h1 className="text-2xl font-bold">{mode === "login" ? "أهلاً بيك في انقلي" : "حساب جديد"}</h1>
          <p className="text-muted mt-1">
            {mode === "login" ? "ادخل برقم موبايلك وكلمة السر" : "رقم موبايلك + كلمة سر تفتكرها"}
          </p>
        </div>
      </header>

      <div className="bg-panel border border-line rounded-card p-4 md:p-5">
        <AuthForm onSuccess={done} onModeChange={setMode} />
      </div>

      <p className="text-center text-sm text-muted flex items-center justify-center gap-1.5">
        <Icon name="lock" className="w-4 h-4" /> رقمك بيستخدم بس لمتابعة طلباتك والتواصل معاك
      </p>
    </div>
  );
}
