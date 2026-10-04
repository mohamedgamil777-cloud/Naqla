import { repo } from "@/data/repo";

export const dynamic = "force-dynamic";

export default async function HelpPage() {
  const branch = await repo.defaultBranch();
  const phone = process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "+201000000000";
  const wa = (process.env.NEXT_PUBLIC_WHATSAPP ?? "+201000000000").replace(/\D/g, "");

  const faqs = [
    { q: "محتاج إيه عشان أستلم العربية؟", a: "بطاقة الرقم القومي ورخصة قيادة سارية. التأمين بيترد بعد فحص العربية." },
    { q: "أقدر ألغي الحجز؟", a: "أيوه، الإلغاء مجاني حتى ٦ ساعات قبل ميعاد الاستلام." },
    { q: "أقدر أطلب سائق؟", a: "أيوه، اختار «العربية + سائق» وأنت بتحجز." },
    { q: "بتوصلوا العربية لعندي؟", a: "أيوه، اختار «توصيل» وأدخل عنوانك — في رسوم توصيل بسيطة." },
  ];

  return (
    <div className="p-4 flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold">محتاج مساعدة؟</h1>

      <div className="grid grid-cols-2 gap-3">
        <a href={`tel:${phone}`} className="tap bg-panel border-2 border-line-2 rounded-2xl py-5 flex flex-col items-center gap-1.5 font-bold">
          <span className="text-3xl">📞</span> اتصل بنا
        </a>
        <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="tap bg-[#25D366] text-white rounded-2xl py-5 flex flex-col items-center gap-1.5 font-bold">
          <span className="text-3xl">💬</span> واتساب
        </a>
      </div>

      <div className="bg-panel border border-line rounded-card p-4">
        <div className="flex items-center gap-2 font-bold text-lg mb-1"><span>📍</span> موقع الفرع</div>
        <p className="font-semibold">{branch.name}</p>
        <p className="text-muted">{branch.address}</p>
        {branch.lat && branch.lng && (
          <a
            href={`https://maps.google.com/?q=${branch.lat},${branch.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 text-primary font-bold"
          >
            افتح الخريطة ›
          </a>
        )}
      </div>

      <div>
        <h2 className="font-extrabold text-lg mb-3">الأسئلة الشائعة</h2>
        <div className="flex flex-col gap-2">
          {faqs.map((f) => (
            <details key={f.q} className="bg-panel border border-line rounded-2xl p-4">
              <summary className="font-bold cursor-pointer">{f.q}</summary>
              <p className="mt-2 text-ink-2">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
