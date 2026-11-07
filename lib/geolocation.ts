/**
 * "My location" for phones. A precise GPS fix often takes longer than 10 s indoors
 * (or never comes), so we ask for GPS first and fall back to the phone's quick
 * network/Wi-Fi location instead of silently giving up.
 */
export type LatLng = { lat: number; lng: number };

export type LocateFailure = "unsupported" | "insecure" | "denied" | "unavailable" | "timeout";

export const LOCATE_ERROR: Record<LocateFailure, string> = {
  unsupported: "المتصفح ده مش بيدعم تحديد الموقع. اكتب العنوان أو حدده على الخريطة.",
  insecure: "تحديد الموقع محتاج تفتح الموقع من رابط https.",
  denied:
    "إذن الموقع مقفول. افتح إعدادات المتصفح ← الموقع ← اسمح لموقعنا، وتأكد إن الـ GPS (الموقع) شغال في الموبايل، وجرب تاني.",
  unavailable:
    "مقدرناش نحدد مكانك. اتأكد إن الـ GPS (الموقع) شغال في الموبايل وجرب تاني، أو حدده على الخريطة.",
  timeout: "تحديد الموقع أخد وقت طويل. جرب تاني في مكان مفتوح، أو حدده على الخريطة.",
};

const IPHONE_DENIED =
  "إذن الموقع مقفول على الآيفون. افتح الإعدادات ← الخصوصية والأمان ← خدمات الموقع وخليها شغالة، ثم «مواقع Safari» (أو Chrome) ← «أثناء الاستخدام». وفي Safari دوس «aA» جنب الرابط ← إعدادات الموقع ← الموقع ← سماح، وجرب تاني.";

/** The message to show; on iPhone/iPad the "denied" steps point to iOS settings. */
export function locateMessage(
  why: LocateFailure,
  userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "",
): string {
  if (why === "denied" && /iPhone|iPad|iPod/.test(userAgent)) return IPHONE_DENIED;
  return LOCATE_ERROR[why] ?? LOCATE_ERROR.unavailable;
}

type Geo = Pick<Geolocation, "getCurrentPosition">;

function once(geo: Geo, options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => geo.getCurrentPosition(resolve, reject, options));
}

function failureOf(err: unknown): LocateFailure {
  const code = (err as GeolocationPositionError | undefined)?.code;
  if (code === 1) return "denied";
  if (code === 3) return "timeout";
  return "unavailable";
}

/** Resolves with the point, or rejects with a LocateFailure. */
export async function getMyLocation(
  geo: Geo | undefined = typeof navigator !== "undefined" ? navigator.geolocation : undefined,
  secure: boolean = typeof window === "undefined" || window.isSecureContext !== false,
): Promise<LatLng> {
  if (!secure) throw "insecure" satisfies LocateFailure;
  if (!geo) throw "unsupported" satisfies LocateFailure;
  try {
    const pos = await once(geo, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch (err) {
    const first = failureOf(err);
    if (first === "denied") throw first; // asking again won't help
    try {
      const pos = await once(geo, { enableHighAccuracy: false, timeout: 20000, maximumAge: 300000 });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch (err2) {
      throw failureOf(err2);
    }
  }
}
