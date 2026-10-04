"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui";

export function CancelButton({ code }: { code: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function cancel() {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/bookings/${code}/cancel`, { method: "POST" });
      if (r.ok) router.refresh();
      else setErr("مش هينفع تلغي الحجز ده دلوقتي.");
    } catch {
      setErr("مشكلة في الاتصال.");
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  }

  if (!confirm) {
    return (
      <Button variant="secondary" full onClick={() => setConfirm(true)}>
        إلغاء الحجز
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {err && <p className="text-booked font-semibold text-center">{err}</p>}
      <p className="text-center font-semibold">متأكد إنك عايز تلغي الحجز؟</p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="danger" onClick={cancel} disabled={busy}>{busy ? "…" : "أيوه، ألغِ"}</Button>
        <Button variant="secondary" onClick={() => setConfirm(false)}>تراجع</Button>
      </div>
    </div>
  );
}
