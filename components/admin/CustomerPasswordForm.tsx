"use client";
import { setCustomerPasswordAction } from "@/actions/admin/accounts";
import type { ActionResult } from "@/lib/action-result";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { MIN_PASSWORD } from "@/lib/password-policy";

/** Temporary password for a customer who forgot theirs (the agent tells it to them by phone). */
export function CustomerPasswordForm({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<ActionResult, FormData>(setCustomerPasswordAction, { ok: false });
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl px-4 py-2 font-bold border-2 border-primary text-primary"
      >
        كلمة سر مؤقتة
      </button>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-2 min-w-64">
      <input type="hidden" name="id" value={id} />
      {state.error && (
        <div className="bg-booked-soft text-booked rounded-xl px-3 py-2 text-sm font-semibold">
          {state.error}
        </div>
      )}
      {state.ok && (
        <div className="bg-ok-soft text-ok rounded-xl px-3 py-2 text-sm font-semibold">
          اتحفظت ✅ قولها للعميل.
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          name="password"
          minLength={MIN_PASSWORD}
          placeholder={`${MIN_PASSWORD} حروف أو أرقام على الأقل`}
          autoComplete="off"
          dir="ltr"
          required
          className="flex-1 rounded-xl border border-line-2 bg-panel px-3 py-2 outline-none focus:border-primary"
        />
        <Submit />
      </div>
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="rounded-xl px-4 py-2 font-bold bg-primary text-white disabled:opacity-50"
    >
      {pending ? "…" : "حفظ"}
    </button>
  );
}
