"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/Icons";
import { authErrorText } from "@/lib/auth-messages";
import { MIN_PASSWORD } from "@/lib/password-policy";

const field =
  "w-full rounded-2xl border-2 border-line bg-panel px-4 py-3.5 text-lg outline-none focus:border-primary placeholder:text-muted/70";
const cta =
  "tap rounded-2xl bg-accent text-on-accent text-lg font-extrabold flex items-center justify-center gap-2 py-3.5 shadow-[0_6px_16px_rgba(242,165,65,0.3)] disabled:opacity-50 disabled:shadow-none";

/** Phone + password for everyone (customers, drivers). New customers create an account here. */
export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (mode === "register" && password !== confirm) {
      setErr("كلمتين السر مش زي بعض.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "login" ? { phone, password } : { phone, name, password }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) {
        const next = new URLSearchParams(window.location.search).get("next");
        router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/bookings");
        router.refresh();
        return;
      }
      if (j.error === "PASSWORD_NOT_SET" && j.account === "customer") setMode("register");
      setErr(authErrorText(j));
    } catch {
      setErr("مفيش اتصال بالإنترنت، جرّب تاني.");
    } finally {
      setBusy(false);
    }
  }

  const switchMode = (m: "login" | "register") => {
    setMode(m);
    setErr(null);
  };

  return (
    <div className="p-4 pt-8 flex flex-col gap-6">
      <header className="flex flex-col items-center text-center gap-3">
        <Logo className="h-20" full />
        <div>
          <h1 className="text-2xl font-extrabold">{mode === "login" ? "أهلاً بيك في انقلي" : "حساب جديد"}</h1>
          <p className="text-muted mt-1">{mode === "login" ? "ادخل برقم موبايلك وكلمة السر" : "رقم موبايلك + كلمة سر تفتكرها"}</p>
        </div>
      </header>

      <div role="tablist" className="grid grid-cols-2 bg-panel-2 rounded-2xl p-1">
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            className={`rounded-xl py-2.5 font-extrabold ${mode === m ? "bg-panel text-primary shadow-sm" : "text-muted"}`}
          >
            {m === "login" ? "دخول" : "حساب جديد"}
          </button>
        ))}
      </div>

      {err && (
        <div role="alert" className="bg-booked-soft text-booked rounded-2xl px-4 py-3 font-semibold flex items-center gap-2">
          <Icon name="xCircle" className="w-5 h-5 shrink-0" /> {err}
        </div>
      )}

      <form onSubmit={submit} className="bg-panel border border-line rounded-card shadow-sm p-4 flex flex-col gap-4">
        {mode === "register" && (
          <label className="flex flex-col gap-1.5">
            <span className="font-bold flex items-center gap-1.5">
              <Icon name="user" className="w-4 h-4 text-primary" /> اسمك
            </span>
            <input className={field} autoComplete="name" placeholder="مثلاً: أحمد محمد" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="font-bold flex items-center gap-1.5">
            <Icon name="phone" className="w-4 h-4 text-primary" /> رقم الموبايل
          </span>
          <input
            className={`${field} text-left tracking-wider`}
            inputMode="tel"
            autoComplete="username"
            placeholder="01xxxxxxxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            dir="ltr"
            required
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-bold flex items-center gap-1.5">
            <Icon name="lock" className="w-4 h-4 text-primary" /> كلمة السر
          </span>
          <input
            className={field}
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={mode === "register" ? MIN_PASSWORD : undefined}
            dir="ltr"
            required
          />
          {mode === "register" && <span className="text-sm text-muted">{MIN_PASSWORD} حروف أو أرقام على الأقل</span>}
        </label>
        {mode === "register" && (
          <label className="flex flex-col gap-1.5">
            <span className="font-bold flex items-center gap-1.5">
              <Icon name="lock" className="w-4 h-4 text-primary" /> اكتب كلمة السر تاني
            </span>
            <input className={field} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} dir="ltr" required />
          </label>
        )}
        <button type="submit" disabled={busy || phone.length < 6 || !password} className={cta}>
          {busy ? "لحظة…" : mode === "login" ? "دخول" : "اعمل الحساب"}
          <Icon name="chevronLeft" className="w-5 h-5" strokeWidth={2.6} />
        </button>
        {mode === "login" && (
          <p className="text-center text-sm text-muted">نسيت كلمة السر؟ كلّم خدمة العملاء وهيعملولك كلمة سر جديدة.</p>
        )}
      </form>

      <p className="text-center text-sm text-muted flex items-center justify-center gap-1.5">
        <Icon name="lock" className="w-4 h-4" /> رقمك بيستخدم بس لمتابعة طلباتك والتواصل معاك
      </p>
    </div>
  );
}
