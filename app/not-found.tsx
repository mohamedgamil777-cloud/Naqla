import Link from "next/link";
import { Icon } from "@/components/Icons";

export default function NotFound() {
  return (
    <div className="min-h-dvh grid place-items-center p-6 text-center bg-ground">
      <div>
        <span className="mx-auto mb-4 w-14 h-14 rounded-full bg-primary-soft text-primary grid place-items-center">
          <Icon name="route" className="w-7 h-7" />
        </span>
        <h1 className="text-xl font-bold">الصفحة مش موجودة</h1>
        <p className="text-muted mt-2">يمكن الرابط قديم أو اتغير.</p>
        <Link
          href="/"
          className="inline-block mt-6 bg-primary text-white rounded-xl px-5 py-2.5 font-semibold hover:bg-primary-ink"
        >
          الرجوع للرئيسية
        </Link>
      </div>
    </div>
  );
}
