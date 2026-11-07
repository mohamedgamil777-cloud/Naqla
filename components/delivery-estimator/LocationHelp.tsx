"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icons";
import type { LatLng, LocateFailure } from "@/lib/geolocation";

type Platform = "iphone" | "android";

const TITLE: Record<LocateFailure, string> = {
  denied: "إذن الموقع مقفول",
  unavailable: "مقدرناش نحدد مكانك",
  timeout: "تحديد الموقع أخد وقت طويل",
  unsupported: "المتصفح ده مش بيدعم تحديد الموقع",
  insecure: "تحديد الموقع محتاج رابط آمن",
};

const STEPS: Record<Platform, { label: string; groups: { title: string; steps: string[] }[] }> = {
  iphone: {
    label: "آيفون",
    groups: [
      {
        title: "1. شغّل خدمات الموقع",
        steps: ["افتح «الإعدادات»", "الخصوصية والأمان ← خدمات الموقع", "خلّي «خدمات الموقع» شغالة"],
      },
      {
        title: "2. اسمح للمتصفح",
        steps: [
          "في نفس الصفحة انزل لـ «مواقع Safari» (أو «Chrome» لو بتستخدمه)",
          "اختار «أثناء استخدام التطبيق»",
          "شغّل «الموقع الدقيق»",
        ],
      },
      {
        title: "3. اسمح لموقعنا في Safari",
        steps: [
          "ارجع للصفحة دي ودوس «aA» جنب الرابط فوق",
          "إعدادات موقع الويب ← الموقع ← «سماح»",
          "اعمل تحديث للصفحة ودوس «موقعي» تاني",
        ],
      },
    ],
  },
  android: {
    label: "أندرويد",
    groups: [
      {
        title: "1. شغّل الموقع (GPS)",
        steps: ["انزل الشريط من فوق الشاشة", "دوس على أيقونة «الموقع» لحد ما تنوّر"],
      },
      {
        title: "2. اسمح لموقعنا في Chrome",
        steps: [
          "دوس على أيقونة القفل جنب الرابط فوق",
          "الأذونات ← الموقع ← «سماح»",
          "لو مش لاقيها: Chrome ← الإعدادات ← إعدادات المواقع ← الموقع",
        ],
      },
      {
        title: "3. اسمح لـ Chrome نفسه",
        steps: [
          "إعدادات الموبايل ← التطبيقات ← Chrome ← الأذونات ← الموقع",
          "اختار «السماح أثناء استخدام التطبيق» وشغّل «استخدام الموقع الدقيق»",
        ],
      },
    ],
  },
};

/**
 * Chrome 144+ (desktop and Android) has a built-in <geolocation> button. Tapping it shows
 * Chrome's own permission prompt again, even after the customer blocked location before,
 * so they can allow it right here without digging through settings.
 * Safari and other browsers don't have it, and no website can open the iPhone Settings app.
 */
function hasGeolocationElement() {
  return typeof window !== "undefined" && "HTMLGeolocationElement" in window;
}

type GeoElement = HTMLElement & { position?: GeolocationPosition | null };

function AllowLocationButton({ onLocated }: { onLocated: (point: LatLng) => void }) {
  const ref = useRef<GeoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handle = () => {
      const pos = el.position;
      if (pos) onLocated({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      else setFailed(true);
    };
    el.addEventListener("location", handle);
    return () => el.removeEventListener("location", handle);
  }, [onLocated]);

  return (
    <div className="mx-5 mt-4 rounded-xl bg-primary-soft px-4 py-3 flex flex-col items-center gap-2 text-center">
      <p className="text-sm font-bold">أسرع حل: دوس على الزرار ده واختار «سماح»</p>
      {/* @ts-expect-error: <geolocation> is a new browser element that React's types don't know yet */}
      <geolocation ref={ref} accuracymode="precise" />
      {failed && <p className="text-xs text-booked">لسه مقفول؟ اتبع الخطوات اللي تحت.</p>}
    </div>
  );
}

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "android";
  return /iPhone|iPad|iPod/.test(navigator.userAgent) ? "iphone" : "android";
}

type Props = {
  /** why the last try failed; null keeps the sheet closed */
  failure: LocateFailure | null;
  open: boolean;
  onClose: () => void;
  onRetry: () => void;
  /** opens the map so the customer can drop the pin by hand; null when there's no map */
  onPickOnMap: (() => void) | null;
  /** the browser's own "allow location" button gave us a position */
  onLocated: (point: LatLng) => void;
};

/** Bottom sheet with step-by-step fixes, shown when "my location" fails. */
export function LocationHelp({ failure, open, onClose, onRetry, onPickOnMap, onLocated }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [platform, setPlatform] = useState<Platform>("android");

  const [canAllowHere, setCanAllowHere] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setCanAllowHere(hasGeolocationElement());
  }, []);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const tabs = Object.keys(STEPS) as Platform[];

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="locate-help-title"
      className="m-0 mt-auto md:m-auto w-full max-w-none md:max-w-md max-h-[92dvh] rounded-t-2xl md:rounded-card bg-panel text-ink p-0 backdrop:bg-ink/50 open:flex flex-col"
    >
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 shrink-0 rounded-full bg-primary-soft text-primary grid place-items-center">
            <Icon name="locate" className="w-5 h-5" />
          </span>
          <div>
            <h2 id="locate-help-title" className="text-lg font-bold">
              {failure ? TITLE[failure] : "تشغيل الموقع"}
            </h2>
            <p className="text-sm text-muted mt-0.5">
              اتبع الخطوات دي مرة واحدة، وبعدها «موقعي» هيشتغل على طول.
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

      {open && canAllowHere && <AllowLocationButton onLocated={onLocated} />}

      <div
        role="tablist"
        className="mx-5 mt-4 grid grid-cols-2 gap-1 rounded-xl bg-panel-2 p-1 text-sm font-bold"
      >
        {tabs.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={platform === p}
            onClick={() => setPlatform(p)}
            className={`rounded-lg py-2 cursor-pointer ${platform === p ? "bg-panel text-primary shadow-sm" : "text-muted"}`}
          >
            {STEPS[p].label}
          </button>
        ))}
      </div>

      <div className="px-5 pt-4 overflow-y-auto flex flex-col gap-4" role="tabpanel">
        {failure === "timeout" && (
          <p className="text-sm rounded-xl bg-panel-2 px-4 py-2.5">
            لو الموقع شغال أصلاً، جرب تاني جنب شباك أو في مكان مفتوح، أو حدد المكان على الخريطة.
          </p>
        )}
        {platform === "iphone" && (
          <p className="text-sm rounded-xl bg-panel-2 px-4 py-2.5">
            الآيفون مش بيسمح لأي موقع إنه يفتح الإعدادات بنفسه، فلازم تفتحها إنت بالخطوات دي (مرة واحدة بس).
          </p>
        )}
        {STEPS[platform].groups.map((g) => (
          <section key={g.title}>
            <h3 className="font-bold text-sm">{g.title}</h3>
            <ul className="mt-1.5 flex flex-col gap-1 text-sm text-ink-2 list-disc ps-5">
              {g.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] flex gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="flex-1 rounded-xl bg-primary text-white font-bold py-3 cursor-pointer"
        >
          جرب تاني
        </button>
        {onPickOnMap && (
          <button
            type="button"
            onClick={onPickOnMap}
            className="flex-1 rounded-xl border border-line font-bold py-3 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Icon name="map" className="w-4 h-4" />
            حدد على الخريطة
          </button>
        )}
      </div>
    </dialog>
  );
}
