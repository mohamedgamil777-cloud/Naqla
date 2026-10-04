"use client";
import { useRouter } from "next/navigation";

export function BoardDatePicker({ date, min, max }: { date: string; min: string; max: string }) {
  const router = useRouter();
  return (
    <input
      type="date"
      defaultValue={date}
      min={min}
      max={max}
      onChange={(e) => {
        if (e.target.value) router.push(`/admin/board?date=${e.target.value}`);
      }}
      className="rounded-xl border border-line-2 bg-panel px-3 py-2 font-semibold"
      aria-label="اختار يوم"
    />
  );
}
