"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/Icons";

const field =
  "w-full rounded-2xl border-2 border-line bg-panel px-4 py-3.5 text-lg outline-none focus:border-primary placeholder:text-muted/70";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
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
      if (j.ok && j.staffUsePasscode) {
        setErr("الرقم ده لموظف إدارة. ادخل من صفحة دخول الإدارة بكلمة السر.");
      } else if (j.ok) {
        setSent(true);
        if (j.devCode) {
          setCode(j.devCode);
          setDevCode(j.devCode);
        }
      } else if (j.error === "TOO_SOON") setErr("استنى نص دقيقة قبل ما تطلب كود جديد.");
      else setErr("رقم الموبايل مش صحيح. اكتبه كده: 01xxxxxxxxx");
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
    <div className="p-4 pt-8 flex flex-col gap-6">
      <header className="flex flex-col items-center text-center gap-3">
        <Logo markClass="h-12" wordClass="text-4xl" caption />
        <div>
          <h1 className="text-2xl font-extrabold">{sent ? "اكتب كود التأكيد" : "أهلاً بيك في نقلة"}</h1>
          <p className="text-muted mt-1">
            {sent ? (
              <>
                بعتنا كود على رقم <span dir="ltr" className="font-bold text-ink">{phone}</span>
              </>
            ) : (
              "اكتب رقم موبايلك وهنبعتلك كود دخول"
            )}
          </p>
        </div>
      </header>

      {/* step dots */}
      <div className="flex justify-center gap-2" aria-hidden>
        <span className="h-1.5 w-8 rounded-full bg-primary" />
        <span className={`h-1.5 w-8 rounded-full ${sent ? "bg-primary" : "bg-line-2"}`} />
      </div>

      {err && (
        <div className="bg-booked-soft text-booked rounded-2xl px-4 py-3 font-semibold flex items-center gap-2">
          <Icon name="xCircle" className="w-5 h-5 shrink-0" /> {err}
        </div>
      )}

      <section className="bg-panel border border-line rounded-card shadow-sm p-4 flex flex-col gap-4">
        {!sent ? (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="font-bold flex items-center gap-1.5">
                <Icon name="phone" className="w-4 h-4 text-primary" /> رقم الموبايل
              </span>
              <input
                className={`${field} text-left tracking-wider`}
                inputMode="tel"
                autoComplete="tel"
                placeholder="01xxxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                dir="ltr"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-bold flex items-center gap-1.5">
                <Icon name="user" className="w-4 h-4 text-primary" /> اسمك <span className="text-muted font-normal text-sm">(اختياري)</span>
              </span>
              <input className={field} autoComplete="name" placeholder="مثلاً: أحمد محمد" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <button
              type="button"
              onClick={send}
              disabled={busy || phone.length < 6}
              className="tap rounded-2xl bg-accent text-on-accent text-lg font-extrabold flex items-center justify-center gap-2 shadow-[0_6px_16px_rgba(242,165,65,0.3)] disabled:opacity-50 disabled:shadow-none"
            >
              {busy ? "بنبعت الكود…" : "ابعتلي الكود"}
              <Icon name="chevronLeft" className="w-5 h-5" strokeWidth={2.6} />
            </button>
          </>
        ) : (
          <>
            {devCode && (
              <div className="bg-reserved-soft text-reserved rounded-2xl px-4 py-3 text-sm font-semibold">
                وضع تجربة: كودك هو <span dir="ltr" className="font-extrabold">{devCode}</span> — اتكتب لوحده، دوس «تأكيد الدخول».
              </div>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="font-bold flex items-center gap-1.5">
                <Icon name="lock" className="w-4 h-4 text-primary" /> كود التأكيد
              </span>
              <input
                className={`${field} text-center text-2xl font-extrabold tracking-[0.6em]`}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="••••"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                dir="ltr"
                autoFocus
              />
            </label>
            <button
              type="button"
              onClick={verify}
              disabled={busy || code.length < 4}
              className="tap rounded-2xl bg-accent text-on-accent text-lg font-extrabold flex items-center justify-center gap-2 shadow-[0_6px_16px_rgba(242,165,65,0.3)] disabled:opacity-50 disabled:shadow-none"
            >
              {busy ? "بنتأكد…" : "تأكيد الدخول"}
              <Icon name="chevronLeft" className="w-5 h-5" strokeWidth={2.6} />
            </button>
            <div className="flex items-center justify-between text-sm font-bold">
              <button type="button" onClick={() => { setSent(false); setCode(""); setDevCode(null); setErr(null); }} className="text-primary flex items-center gap-1">
                <Icon name="pencil" className="w-4 h-4" /> غيّر الرقم
              </button>
              <button type="button" onClick={send} disabled={busy} className="text-primary disabled:opacity-50">
                ابعت الكود تاني
              </button>
            </div>
          </>
        )}
      </section>

      <p className="text-center text-sm text-muted flex items-center justify-center gap-1.5">
        <Icon name="lock" className="w-4 h-4" /> رقمك بيستخدم بس لمتابعة طلباتك والتواصل معاك
      </p>
    </div>
  );
}
