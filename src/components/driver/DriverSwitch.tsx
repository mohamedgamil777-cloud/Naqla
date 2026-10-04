"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/** Log out of the current phone and go to the driver login. Lets someone who is
 *  signed in as a customer switch to their driver number without hunting for the
 *  logout button. */
export function DriverSwitch({ label = "ادخل برقم تاني", subtle = false }: { label?: string; subtle?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const cls = subtle
    ? "text-muted text-sm font-bold underline tap disabled:opacity-50"
    : "w-full rounded-2xl bg-primary text-white py-3.5 text-lg font-extrabold tap disabled:opacity-50";
  return (
    <button
      onClick={async () => {
        setBusy(true);
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } catch {}
        router.push("/login?next=/driver");
        router.refresh();
      }}
      disabled={busy}
      className={cls}
    >
      {busy ? "…" : label}
    </button>
  );
}
