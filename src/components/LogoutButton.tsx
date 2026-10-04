"use client";
import { useRouter } from "next/navigation";
import { Button } from "./ui";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }
  return (
    <Button variant="secondary" full onClick={logout}>
      تسجيل الخروج
    </Button>
  );
}
