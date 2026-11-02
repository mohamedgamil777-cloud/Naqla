"use client";
/** Shown when a page or a form action fails unexpectedly (details are in the server log, never here). */
import Link from "next/link";
import { Icon } from "@/components/Icons";

type ErrorPageProps = { error: Error & { digest?: string }; reset: () => void };

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <div className="min-h-dvh grid place-items-center p-6 text-center bg-ground">
      <div>
        <span className="mx-auto mb-4 w-14 h-14 rounded-full bg-booked-soft text-booked grid place-items-center">
          <Icon name="alert" className="w-7 h-7" />
        </span>
        <h1 className="text-xl font-bold">حصلت مشكلة</h1>
        <p className="text-muted mt-2">اللي عملته متسجّلش. جرّب تاني بعد شوية.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={reset}
            className="bg-primary text-white rounded-xl px-5 py-2.5 font-semibold cursor-pointer hover:bg-primary-ink"
          >
            حاول تاني
          </button>
          <Link
            href="/"
            className="border border-line-2 bg-panel rounded-xl px-5 py-2.5 font-semibold hover:bg-panel-2"
          >
            الرجوع للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
