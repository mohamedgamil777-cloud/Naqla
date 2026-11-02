"use client";
/** Shown when a page or a form action fails unexpectedly (details are in the server log, never here). */
import Link from "next/link";

type ErrorPageProps = { error: Error & { digest?: string }; reset: () => void };

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <div className="min-h-dvh grid place-items-center p-6 text-center bg-ground">
      <div>
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-extrabold">حصلت مشكلة</h1>
        <p className="text-muted mt-2">اللي عملته متسجّلش. جرّب تاني بعد شوية.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button onClick={reset} className="bg-primary text-white rounded-2xl px-6 py-3 font-bold">
            حاول تاني
          </button>
          <Link href="/" className="border-2 border-line-2 rounded-2xl px-6 py-3 font-bold">
            الرجوع للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
