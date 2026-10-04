"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { adminLogin, type LoginState } from "./actions";
import { inputClass } from "@/components/ui";

export function AdminLoginForm() {
  const [state, action] = useActionState<LoginState, FormData>(adminLogin, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      {state.error && (
        <div className="bg-booked-soft text-booked rounded-xl px-3 py-2 text-sm font-semibold">{state.error}</div>
      )}
      <input
        className={inputClass}
        type="password"
        name="passcode"
        placeholder="كلمة السر"
        autoFocus
        autoComplete="current-password"
      />
      <SubmitBtn />
    </form>
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
