"use client";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }
  return (
    <button
      type="button"
      onClick={logout}
      className="tap w-full rounded-2xl border-2 border-line-2 bg-panel text-booked font-bold flex items-center justify-center gap-2 hover:bg-booked-soft"
    >
      <Icon name="logOut" className="w-5 h-5" /> تسجيل الخروج
    </button>
  );
}
