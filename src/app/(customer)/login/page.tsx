"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, inputClass } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const j = await r.json();
      if (j.ok) {
        setSent(true);
        if (j.devCode) {
          setCode(j.devCode);
          setHint(`وضع تجربة: كودك هو ${j.devCode} — دوسّ «تأكيد الدخول».`);
        } else {
          setHint("تم إرسال كود على موبايلك.");
        }
      } else setErr("رقم الموبايل مش صحيح.");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, name: name || undefined }),
      });
      const j = await r.json();
      if (j.ok) {
        const next = new URLSearchParams(window.location.search).get("next");
        router.push(next && next.startsWith("/") ? next : "/bookings");
        router.refresh();
      } else setErr("الكود مش صحيح، حاول تاني.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <h1 className="text-2xl font-extrabold">الدخول</h1>
      <p className="text-muted">اكتب رقم موبايلك عشان نبعتلك كود الدخول.</p>

      {err && <div className="bg-booked-soft text-booked rounded-2xl px-4 py-3 font-semibold">{err}</div>}

      <div className="bg-panel border border-line rounded-card p-4 flex flex-col gap-3">
        <input className={inputClass} placeholder="اسمك (اختياري)" value={name} onChange={(e) => setName(e.target.value)} />
        <input
          className={inputClass}
          inputMode="tel"
          placeholder="رقم الموبايل"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          dir="ltr"
        />
        {!sent ? (
          <Button full onClick={send} disabled={busy || phone.length < 6}>
            {busy ? "…" : "إرسال الكود"}
          </Button>
        ) : (
          <>
            <input className={inputClass} inputMode="numeric" placeholder="الكود" value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" />
            <Button full onClick={verify} disabled={busy || code.length < 4}>
              {busy ? "…" : "تأكيد الدخول"}
            </Button>
            {hint && <p className="text-sm text-muted">{hint}</p>}
          </>
        )}
      </div>
    </div>
  );
}
