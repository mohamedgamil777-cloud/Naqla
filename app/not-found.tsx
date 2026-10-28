import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-dvh grid place-items-center p-6 text-center bg-ground">
      <div>
        <div className="text-6xl mb-4">🚚</div>
        <h1 className="text-2xl font-extrabold">الصفحة مش موجودة</h1>
        <p className="text-muted mt-2">يمكن الرابط قديم أو اتغير.</p>
        <Link href="/" className="inline-block mt-6 bg-primary text-white rounded-2xl px-6 py-3 font-bold">
          الرجوع للرئيسية
        </Link>
      </div>
    </div>
  );
}
