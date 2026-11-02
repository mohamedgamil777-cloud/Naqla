"use client";
import { adminLogin, staffLogin, type LoginState } from "@/actions/admin-auth";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { inputClass } from "@/components/ui";

export function AdminLoginForm({ passcodeEnabled }: { passcodeEnabled: boolean }) {
  const [state, action] = useActionState<LoginState, FormData>(staffLogin, { ok: false });
  const [usePasscode, setUsePasscode] = useState(false);
  if (usePasscode) return <PasscodeForm onBack={() => setUsePasscode(false)} />;
  return (
    <div className="flex flex-col gap-3">
      <form action={action} className="flex flex-col gap-3">
        {state.error && <ErrorBox text={state.error} />}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-bold text-ink-2">رقم الموبايل</span>
          <input
            className={inputClass}
            type="tel"
            name="phone"
            placeholder="01xxxxxxxxx"
            dir="ltr"
            autoFocus
            autoComplete="username"
            inputMode="tel"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-bold text-ink-2">كلمة السر</span>
          <input className={inputClass} type="password" name="password" autoComplete="current-password" />
        </label>
        <SubmitBtn />
      </form>
      {passcodeEnabled && (
        <button
          type="button"
          onClick={() => setUsePasscode(true)}
          className="text-sm text-muted underline self-center"
        >
          دخول احتياطي بكلمة سر الإدارة
        </button>
      )}
    </div>
  );
}

function PasscodeForm({ onBack }: { onBack: () => void }) {
  const [state, action] = useActionState<LoginState, FormData>(adminLogin, { ok: false });
  return (
    <form action={action} className="flex flex-col gap-3">
      {state.error && <ErrorBox text={state.error} />}
      <input
        className={inputClass}
        type="password"
        name="passcode"
        placeholder="كلمة سر الإدارة"
        autoFocus
        autoComplete="current-password"
      />
      <SubmitBtn />
      <button type="button" onClick={onBack} className="text-sm text-primary font-bold self-center">
        رجوع للدخول برقم الموبايل
      </button>
    </form>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div role="alert" className="bg-booked-soft text-booked rounded-xl px-3 py-2 text-sm font-semibold">
      {text}
    </div>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-2xl bg-primary text-white py-3.5 text-lg font-extrabold tap disabled:opacity-50"
    >
      {pending ? "…" : "دخول"}
    </button>
  );
}
