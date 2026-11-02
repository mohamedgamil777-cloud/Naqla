"use client";
import { useEffect, useRef } from "react";
import { AuthForm } from "@/components/AuthForm";
import { Icon } from "@/components/Icons";
import { formatEgp } from "@/lib/money";

type AuthGateProps = {
  open: boolean;
  /** the order total, so the customer sees what they're finishing */
  total: number | null;
  onClose: () => void;
  /** signed in or registered → the order is sent again automatically */
  onAuthenticated: () => void;
};

/**
 * Shown instead of an error when a logged-out customer orders: sign in or create an account right
 * here, and the order goes through without leaving the page (nothing typed is lost).
 */
export function AuthGate({ open, total, onClose, onAuthenticated }: AuthGateProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()} // backdrop click
      aria-labelledby="auth-gate-title"
      className="m-0 mt-auto md:m-auto w-full max-w-none md:max-w-md max-h-[92dvh] rounded-t-2xl md:rounded-card bg-panel text-ink p-0 backdrop:bg-ink/50 open:flex flex-col"
    >
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 shrink-0 rounded-full bg-primary-soft text-primary grid place-items-center">
            <Icon name="lock" className="w-5 h-5" />
          </span>
          <div>
            <h2 id="auth-gate-title" className="text-lg font-bold">
              خطوة أخيرة: سجّل دخولك
            </h2>
            <p className="text-sm text-muted mt-0.5">
              محتاجين حسابك عشان نبعتلك تفاصيل الطلب ونكلّمك على موبايلك. طلبك محفوظ وهيتبعت أول ما تدخل.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="اقفل"
          className="w-9 h-9 -me-2 -mt-1 shrink-0 grid place-items-center rounded-lg text-muted cursor-pointer hover:bg-panel-2 hover:text-ink"
        >
          <Icon name="close" className="w-5 h-5" />
        </button>
      </div>

      {total != null && (
        <div className="mx-5 mt-4 flex items-center justify-between rounded-xl bg-panel-2 px-4 py-2.5 text-sm">
          <span className="text-ink-2">إجمالي طلبك</span>
          <span className="font-bold text-emph">{formatEgp(total)}</span>
        </div>
      )}

      <div className="px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] overflow-y-auto">
        {open && <AuthForm initialMode="register" onSuccess={onAuthenticated} />}
      </div>
    </dialog>
  );
}
