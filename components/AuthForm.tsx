"use client";
import { useId, useState } from "react";
import { Icon } from "@/components/Icons";
import { inputClass } from "@/components/ui";
import { authErrorText } from "@/lib/auth-messages";
import { MIN_PASSWORD } from "@/lib/password-policy";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export type AuthMode = "login" | "register";

type AuthFormProps = {
  /** called after the session cookie is set */
  onSuccess: () => void;
  initialMode?: AuthMode;
  /** the mode tabs changed (the login page uses it for its heading) */
  onModeChange?: (mode: AuthMode) => void;
};

/** Phone (or company username) + password sign-in, a new customer account, or a forgotten password.
 *  Used by /login and by the order sign-in step. */
export function AuthForm({ onSuccess, initialMode = "login", onModeChange }: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);
  const hintId = useId();

  const switchMode = (m: AuthMode) => {
    setMode(m);
    setErr(null);
    onModeChange?.(m);
  };

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
        onSuccess();
        return;
      }
      if (j.error === "PASSWORD_NOT_SET" && j.account === "customer") switchMode("register");
      setErr(authErrorText(j));
    } catch {
      setErr("مفيش اتصال بالإنترنت، جرّب تاني.");
    } finally {
      setBusy(false);
    }
  }

  const label = "flex items-center gap-1.5 mb-1.5 text-sm font-semibold";

  if (resetting)
    return <ResetPasswordForm initialLogin={phone} onSuccess={onSuccess} onBack={() => setResetting(false)} />;

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" className="grid grid-cols-2 bg-panel-2 rounded-xl p-1">
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            className={`rounded-lg py-2 font-semibold cursor-pointer ${mode === m ? "bg-panel text-primary-ink shadow-sm" : "text-muted hover:text-ink"}`}
          >
            {m === "login" ? "عندي حساب" : "حساب جديد"}
          </button>
        ))}
      </div>

      {err && (
        <div
          role="alert"
          className="bg-booked-soft text-booked rounded-xl px-3.5 py-2.5 text-sm font-semibold flex items-center gap-2"
        >
          <Icon name="xCircle" className="w-5 h-5 shrink-0" /> {err}
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-3.5">
        {mode === "register" && (
          <label>
            <span className={label}>
              <Icon name="user" className="w-4 h-4 text-primary" /> اسمك
            </span>
            <input
              className={inputClass}
              autoComplete="name"
              placeholder="مثلاً: أحمد محمد"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
        )}
        <label>
          <span className={label}>
            <Icon name="phone" className="w-4 h-4 text-primary" />{" "}
            {mode === "login" ? "رقم الموبايل أو اسم المستخدم" : "رقم الموبايل"}
          </span>
          <input
            className={`${inputClass} text-left tracking-wider`}
            inputMode={mode === "login" ? "text" : "tel"}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={mode === "login" ? "01xxxxxxxxx أو ahmed.nour" : "01xxxxxxxxx"}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            dir="ltr"
            required
          />
        </label>
        <div>
          <label>
            <span className={label}>
              <Icon name="lock" className="w-4 h-4 text-primary" /> كلمة السر
            </span>
            <input
              className={inputClass}
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={mode === "register" ? MIN_PASSWORD : undefined}
              aria-describedby={mode === "register" ? hintId : undefined}
              dir="ltr"
              required
            />
          </label>
          {mode === "register" && (
            <span id={hintId} className="block mt-1 text-sm text-muted">
              {MIN_PASSWORD} حروف أو أرقام على الأقل
            </span>
          )}
        </div>
        {mode === "register" && (
          <label>
            <span className={label}>
              <Icon name="lock" className="w-4 h-4 text-primary" /> اكتب كلمة السر تاني
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
        )}
        <button
          type="submit"
          disabled={busy || phone.trim().length < 3 || !password}
          className="tap mt-1 rounded-xl bg-accent text-on-accent font-semibold flex items-center justify-center gap-2 cursor-pointer hover:brightness-95 disabled:opacity-50"
        >
          {busy ? "لحظة…" : mode === "login" ? "دخول" : "اعمل الحساب"}
          <Icon name="arrowLeft" className="w-5 h-5" strokeWidth={2.2} />
        </button>
        {mode === "login" && (
          <button
            type="button"
            onClick={() => {
              setErr(null);
              setResetting(true);
            }}
            className="text-center text-sm font-bold text-primary"
          >
            نسيت كلمة السر؟
          </button>
        )}
      </form>
    </div>
  );
}
