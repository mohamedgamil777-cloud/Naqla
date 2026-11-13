"use client";
/** Forgot password: a code by SMS to the account's phone, then a new password (signs the person in). */
import { useState } from "react";
import { Icon } from "@/components/Icons";
import { inputClass } from "@/components/ui";
import { authErrorText } from "@/lib/auth-messages";
import { MIN_PASSWORD } from "@/lib/password-policy";

type Props = { initialLogin: string; onSuccess: () => void; onBack: () => void };

export function ResetPasswordForm({ initialLogin, onSuccess, onBack }: Props) {
  const [step, setStep] = useState<"ask" | "code">("ask");
  const [login, setLogin] = useState(initialLogin);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function post(url: string, body: object) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { ok: r.ok, j: await r.json().catch(() => ({})) };
  }

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const { ok, j } = await post("/api/auth/reset/request", { login });
      if (!ok) return setErr(authErrorText(j));
      setSentTo(j.sentTo ?? null);
      setStep("code");
    } catch {
      setErr("مفيش اتصال بالإنترنت، جرّب تاني.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmReset(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password !== confirm) return setErr("كلمتين السر مش زي بعض.");
    setBusy(true);
    try {
      const { ok, j } = await post("/api/auth/reset/confirm", { login, code, password });
      if (ok && j.ok) return onSuccess();
      setErr(authErrorText(j));
    } catch {
      setErr("مفيش اتصال بالإنترنت، جرّب تاني.");
    } finally {
      setBusy(false);
    }
  }

  const label = "flex items-center gap-1.5 mb-1.5 text-sm font-semibold";
  const button =
    "tap mt-1 rounded-xl bg-accent text-on-accent font-semibold flex items-center justify-center gap-2 cursor-pointer hover:brightness-95 disabled:opacity-50";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-extrabold">تغيير كلمة السر</h2>
        <p className="text-sm text-muted mt-0.5">
          {step === "ask"
            ? "هنبعت كود من 6 أرقام في رسالة على رقم الموبايل المسجّل في حسابك."
            : sentTo
              ? `بعتنا الكود في رسالة على الرقم اللي آخره ${sentTo.slice(-2)}.`
              : "لو الحساب موجود، بعتنا الكود في رسالة على رقم الموبايل المسجّل فيه."}
        </p>
      </div>

      {err && (
        <div
          role="alert"
          className="bg-booked-soft text-booked rounded-xl px-3.5 py-2.5 text-sm font-semibold flex items-center gap-2"
        >
          <Icon name="xCircle" className="w-5 h-5 shrink-0" /> {err}
        </div>
      )}

      {step === "ask" ? (
        <form onSubmit={sendCode} className="flex flex-col gap-3.5">
          <label>
            <span className={label}>
              <Icon name="phone" className="w-4 h-4 text-primary" /> رقم الموبايل أو اسم المستخدم
            </span>
            <input
              className={`${inputClass} text-left tracking-wider`}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="01xxxxxxxxx أو ahmed.nour"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              dir="ltr"
              required
            />
          </label>
          <button type="submit" disabled={busy || login.trim().length < 3} className={button}>
            {busy ? "لحظة…" : "ابعتلي الكود"}
          </button>
        </form>
      ) : (
        <form onSubmit={confirmReset} className="flex flex-col gap-3.5">
          <label>
            <span className={label}>
              <Icon name="key" className="w-4 h-4 text-primary" /> الكود
            </span>
            <input
              className={`${inputClass} text-center tracking-[0.5em] text-lg`}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              dir="ltr"
              required
            />
          </label>
          <label>
            <span className={label}>
              <Icon name="lock" className="w-4 h-4 text-primary" /> كلمة السر الجديدة
            </span>
            <input
              className={inputClass}
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              dir="ltr"
              required
            />
          </label>
          <label>
            <span className={label}>
              <Icon name="lock" className="w-4 h-4 text-primary" /> اكتبها تاني
            </span>
            <input
              className={inputClass}
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              dir="ltr"
              required
            />
          </label>
          <button type="submit" disabled={busy || code.length !== 6 || !password} className={button}>
            {busy ? "لحظة…" : "غيّر كلمة السر وادخل"}
          </button>
          <button type="button" onClick={() => void sendCode()} disabled={busy} className="text-sm font-bold text-primary">
            مجاليش كود؟ ابعته تاني
          </button>
        </form>
      )}

      <button type="button" onClick={onBack} className="text-sm font-bold text-ink-2">
        → رجوع لتسجيل الدخول
      </button>
    </div>
  );
}
