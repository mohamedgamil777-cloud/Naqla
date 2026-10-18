"use client";
import { Icon } from "@/components/Icons";

/** Print / save as PDF (the browser's print dialog offers "Save as PDF"). */
export function PrintButton({ label = "طباعة / حفظ PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden rounded-xl bg-primary text-white px-5 py-2.5 font-bold flex items-center gap-2"
    >
      <Icon name="file" className="w-5 h-5" /> {label}
    </button>
  );
}
