"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { saveVehicle, type FormState } from "@/app/admin/actions";
import { VEHICLE_STATUS_LABEL, VEHICLE_STATUSES } from "@/lib/constants";
import type { CategoryDTO, VehicleEditData, VehiclePricingInput } from "@/data/types";

const PRESET_IMAGES = [
  { url: "/vehicles/pickup-double.svg", label: "بيك أب دبل" },
  { url: "/vehicles/pickup-single.svg", label: "بيك أب" },
  { url: "/vehicles/van-medium.svg", label: "فان متوسط" },
  { url: "/vehicles/van-large.svg", label: "فان كبير" },
];

const inp = "w-full rounded-xl border border-line-2 bg-panel px-3 py-2.5 text-base outline-none focus:border-primary";
const lbl = "block text-sm font-bold text-ink-2 mb-1.5";

function egpVal(piastres: number | undefined): string {
  if (!piastres) return "";
  return String(piastres / 100);
}

/** Read + downscale an uploaded image to a compact JPEG data URL (client-side). */
function fileToDataUrl(file: File, maxW = 1000, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(url);
      if (!ctx) return reject(new Error("no-canvas"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("img-error"));
    };
    img.src = url;
  });
}

export function VehicleForm({
  categories,
  vehicle,
  defaultPricing,
}: {
  categories: CategoryDTO[];
  vehicle?: VehicleEditData;
  defaultPricing?: VehiclePricingInput;
}) {
  const [state, action] = useActionState<FormState, FormData>(saveVehicle, { ok: false });
  // Prefill pricing from the vehicle, or sensible defaults for a new vehicle.
  const p = vehicle?.pricing ?? defaultPricing;

  const [imageUrl, setImageUrl] = useState<string>(vehicle?.images?.[0] ?? PRESET_IMAGES[0].url);
  const [imgBusy, setImgBusy] = useState(false);
  const [imgErr, setImgErr] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgErr(null);
    if (file.size > 8 * 1024 * 1024) {
      setImgErr("الصورة كبيرة جداً، اختار صورة أصغر.");
      return;
    }
    setImgBusy(true);
    try {
      setImageUrl(await fileToDataUrl(file));
    } catch {
      setImgErr("مش قادر يقرأ الصورة، جرب صورة تانية.");
    } finally {
      setImgBusy(false);
    }
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      {vehicle && <input type="hidden" name="id" value={vehicle.id} />}
      {state.error && <div className="bg-booked-soft text-booked rounded-xl px-4 py-3 font-semibold">{state.error}</div>}

      {/* Photo */}
      <fieldset className="bg-panel border border-line rounded-card p-5">
        <legend className="font-extrabold px-2">صورة العربية</legend>
        <input type="hidden" name="imageUrl" value={imageUrl} />
        <div className="flex flex-wrap items-center gap-5 mt-2">
          <div className="relative w-48 h-28 rounded-xl overflow-hidden bg-panel-2 border border-line-2 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="صورة العربية" className="absolute inset-0 w-full h-full object-cover" />
          </div>
          <div className="flex flex-col gap-3">
            <label className="rounded-xl px-4 py-2.5 font-bold bg-primary text-white cursor-pointer inline-flex items-center gap-2 w-fit">
              📷 {imgBusy ? "بيرفع…" : "ارفع صورة من جهازك"}
              <input type="file" accept="image/*" onChange={onFile} className="hidden" />
            </label>
            {imgErr && <span className="text-booked text-sm font-semibold">{imgErr}</span>}
            <span className="text-xs text-muted">أو اختار صورة جاهزة:</span>
            <div className="flex gap-2">
              {PRESET_IMAGES.map((img) => (
                <button
                  key={img.url}
                  type="button"
                  onClick={() => setImageUrl(img.url)}
                  title={img.label}
                  className={`w-16 h-11 rounded-lg overflow-hidden border-2 ${imageUrl === img.url ? "border-primary" : "border-line-2"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </fieldset>

      {/* Basics */}
      <fieldset className="bg-panel border border-line rounded-card p-5">
        <legend className="font-extrabold px-2">البيانات الأساسية</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <label><span className={lbl}>اسم العربية *</span><input className={inp} name="name" defaultValue={vehicle?.name} required /></label>
          <label><span className={lbl}>رقم اللوحة *</span><input className={inp} name="plate" defaultValue={vehicle?.plate} required /></label>
          <label>
            <span className={lbl}>النوع *</span>
            <select className={inp} name="categoryId" defaultValue={vehicle?.categoryId ?? ""} required>
              <option value="" disabled>اختار النوع</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.kind === "van" ? "فان" : "بيك أب"})</option>
              ))}
            </select>
          </label>
          <label>
            <span className={lbl}>الحالة</span>
            <select className={inp} name="status" defaultValue={vehicle?.status ?? "available"}>
              {VEHICLE_STATUSES.map((s) => (
                <option key={s} value={s}>{VEHICLE_STATUS_LABEL[s]}</option>
              ))}
            </select>
          </label>
          <label><span className={lbl}>الماركة</span><input className={inp} name="brand" defaultValue={vehicle?.brand ?? ""} /></label>
          <label><span className={lbl}>الموديل</span><input className={inp} name="model" defaultValue={vehicle?.model ?? ""} /></label>
          <label><span className={lbl}>سنة الصنع</span><input className={inp} name="year" type="number" min="1990" max="2100" defaultValue={vehicle?.year ?? ""} /></label>
          <label><span className={lbl}>اللون</span><input className={inp} name="color" defaultValue={vehicle?.color ?? ""} /></label>
          <label>
            <span className={lbl}>ناقل الحركة</span>
            <select className={inp} name="transmission" defaultValue={vehicle?.transmission ?? "manual"}>
              <option value="manual">عادي</option>
              <option value="automatic">أوتوماتيك</option>
            </select>
          </label>
          <label>
            <span className={lbl}>الوقود</span>
            <select className={inp} name="fuel" defaultValue={vehicle?.fuel ?? "benzine"}>
              <option value="benzine">بنزين</option>
              <option value="diesel">سولار</option>
              <option value="gas">غاز</option>
              <option value="electric">كهرباء</option>
            </select>
          </label>
          <label><span className={lbl}>عدد الركاب</span><input className={inp} name="seats" type="number" min="1" defaultValue={vehicle?.seats ?? ""} /></label>
          <label><span className={lbl}>الحمولة (كجم)</span><input className={inp} name="cargoKg" type="number" min="0" defaultValue={vehicle?.cargoKg ?? ""} /></label>
          <label className="flex items-center gap-3 md:col-span-2 mt-1">
            <input type="checkbox" name="hasDriverOption" defaultChecked={vehicle?.hasDriverOption ?? true} className="w-5 h-5" />
            <span className="font-bold">متاح تأجيرها بسائق</span>
          </label>
        </div>
      </fieldset>

      {/* Pricing */}
      <fieldset className="bg-panel border border-line rounded-card p-5">
        <legend className="font-extrabold px-2">الأسعار (بالجنيه)</legend>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
          <label><span className={lbl}>سعر الساعة</span><input className={inp} name="hour1" type="number" min="0" step="5" defaultValue={egpVal(p?.hour1)} /></label>
          <label><span className={lbl}>ساعتين</span><input className={inp} name="hour2" type="number" min="0" step="5" defaultValue={egpVal(p?.hour2)} /></label>
          <label><span className={lbl}>4 ساعات</span><input className={inp} name="hour4" type="number" min="0" step="5" defaultValue={egpVal(p?.hour4)} /></label>
          <label><span className={lbl}>8 ساعات</span><input className={inp} name="hour8" type="number" min="0" step="5" defaultValue={egpVal(p?.hour8)} /></label>
          <label><span className={lbl}>اليوم الكامل</span><input className={inp} name="daily" type="number" min="0" step="10" defaultValue={egpVal(p?.daily)} /></label>
          <label><span className={lbl}>ساعة إضافية</span><input className={inp} name="extraHour" type="number" min="0" step="5" defaultValue={egpVal(p?.extraHour)} /></label>
          <label><span className={lbl}>التأمين</span><input className={inp} name="deposit" type="number" min="0" step="10" defaultValue={egpVal(p?.deposit)} /></label>
          <label><span className={lbl}>السائق / ساعة</span><input className={inp} name="driverFee" type="number" min="0" step="5" defaultValue={egpVal(p?.driverFeePerHour)} /></label>
          <label>
            <span className={lbl}>أجر الشيّال (العمالة) / فرد</span>
            <input className={inp} name="loaderFee" type="number" min="0" step="5" defaultValue={egpVal(p?.loaderFeePerPerson)} placeholder="مثلاً 80" />
          </label>
          <label>
            <span className={lbl}>سعر الكيلومتر</span>
            <input className={inp} name="perKm" type="number" min="0" step="1" defaultValue={egpVal(p?.perKmPrice)} placeholder="مثلاً 5" />
          </label>
          <label><span className={lbl}>رسوم التوصيل</span><input className={inp} name="deliveryFee" type="number" min="0" step="5" defaultValue={egpVal(p?.deliveryFee)} /></label>
        </div>
        <p className="text-sm text-muted mt-3">«أجر الشيّال» هو تكلفة كل عامل تحميل — العميل بيختار عدد العمّال وقت الحجز والسعر بيتحسب تلقائياً.</p>
      </fieldset>

      <div className="flex gap-3">
        <SubmitBtn isEdit={Boolean(vehicle)} />
        <Link href="/admin/fleet" className="rounded-2xl px-6 py-3 font-bold border-2 border-line-2 bg-panel">إلغاء</Link>
      </div>
    </form>
  );
}

function SubmitBtn({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-2xl px-6 py-3 font-bold bg-primary text-white disabled:opacity-50">
      {pending ? "بيحفظ…" : isEdit ? "حفظ التعديلات" : "إضافة العربية"}
    </button>
  );
}
