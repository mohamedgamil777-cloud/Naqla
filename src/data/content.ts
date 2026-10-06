/**
 * Admin-editable app content (contact numbers, home texts/image, FAQs, order-screen
 * options). Stored as ONE JSON document; anything missing falls back to DEFAULT_CONTENT,
 * so adding a field later never breaks an older saved document.
 */

export type FaqTopic = "order" | "price" | "driver" | "payment" | "cancel";
export type CargoIcon = "file" | "box" | "sofa" | "home" | "truck";

export interface FaqItem {
  id: string;
  topic: FaqTopic;
  q: string;
  /** May contain {ساعات_الإلغاء} and {أجر_العامل}, filled in from live settings. */
  a: string;
}

export interface CargoOption {
  label: string;
  size: string; // suggested size code: XS / S / M / L
  icon: CargoIcon;
}

export interface AppContent {
  supportPhone: string; // call centre: hotline (16xxx) or mobile
  whatsapp: string; // mobile used for wa.me
  home: {
    title: string;
    subtitle: string; // a line break splits it into two lines
    heroImage: string | null; // uploaded photo (data URL); null = built-in illustration
    trust: [string, string, string];
    steps: [string, string, string, string];
  };
  faqs: FaqItem[];
  order: {
    loaderFee: number; // piastres per helper — used by the price engine
    maxLoaders: number;
    disclaimer: string;
    cargo: CargoOption[];
  };
}

export const FAQ_TOPICS: { id: FaqTopic; label: string }[] = [
  { id: "order", label: "الطلب" },
  { id: "price", label: "السعر" },
  { id: "driver", label: "السواق" },
  { id: "payment", label: "الدفع" },
  { id: "cancel", label: "الإلغاء" },
];

export const DEFAULT_CONTENT: AppContent = {
  supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? "",
  home: {
    title: "محتاج تنقل حاجة؟",
    subtitle: "أسرع وأسهل طريقة لنقل أغراضك\nمع سائق معتمد من نقلة",
    heroImage: null,
    trust: ["سعر واضح من البداية", "في دقائق", "بدون وجع دماغ"],
    steps: ["حدد مكان النقل", "اختار حجم العربية", "اختار الميعاد", "اطلب واستنى التأكيد"],
  },
  faqs: [
    { id: "f1", topic: "order", q: "إزاي أطلب توصيلة؟", a: "من الصفحة الرئيسية دوس «اطلب توصيلة»، اكتب عنوان الاستلام والتسليم، اختار اليوم والساعة وحجم العربية المناسب لحاجتك. هتشوف السعر قدامك على طول، وبعدين دوس «اطلب التوصيلة» واكتب رقم موبايلك والكود اللي هيوصلك. هيظهرلك رقم الطلب، وهنكلمك نأكد معاك الميعاد." },
    { id: "f2", topic: "order", q: "أقدر أغيّر ميعاد الطلب؟", a: "أيوه. كلمنا أو ابعتلنا على واتساب برقم الطلب والميعاد الجديد، وإحنا نغيّره لك طالما في عربية متاحة في الميعاد ده. يا ريت تبلغنا بدري قبل الميعاد بوقت كافي." },
    { id: "f3", topic: "order", q: "لازم أعمل حساب عشان أطلب؟", a: "لأ. تقدر تشوف الأسعار وتجهّز طلبك من غير تسجيل. في الآخر بس هنطلب رقم موبايلك ونبعتلك كود تأكيد، وده بيبقى حسابك اللي تتابع منه طلباتك." },
    { id: "f4", topic: "price", q: "إزاي أعرف سعر التوصيلة؟", a: "السعر بيظهر لوحده وأنت بتجهّز الطلب وقبل ما تأكد. بيتحسب من: رسوم أساسية حسب حجم العربية + سعر الكيلو حسب المسافة + العمالة لو طلبتها − أي خصم. دوس «تفاصيل السعر» تحت عشان تشوف كل بند لوحده." },
    { id: "f5", topic: "price", q: "هل السعر ده نهائي؟", a: "السعر اللي بيظهرلك تقديري حسب المسافة على الخريطة والحجم اللي اخترته. لو المسافة الحقيقية أو الحمولة مختلفة كتير، خدمة العملاء هتبلغك بالسعر النهائي قبل التنفيذ. مفيش أي مصاريف مخفية." },
    { id: "f6", topic: "price", q: "العمالة (الشيّالين) بكام؟", a: "كل فرد عمالة بـ {أجر_العامل}. تقدر تطلب أفراد يساعدوا في التحميل والتنزيل، وبيتضافوا على السعر قدامك." },
    { id: "f7", topic: "price", q: "إزاي أستخدم كود الخصم؟", a: "في صفحة الطلب، اكتب الكود في خانة «كود الخصم» ودوس «تطبيق». لو الكود صحيح هيظهر الخصم في السعر على طول. بعض الأكواد ليها حد أدنى للطلب أو تاريخ انتهاء." },
    { id: "f8", topic: "driver", q: "إزاي أتابع السواق؟", a: "من «طلباتي» هتلاقي حالة طلبك خطوة بخطوة: استلمنا طلبك ← تم التأكيد ← جاري البحث عن سائق ← تم تعيين السائق (واسمه) ← السائق في الطريق ← السائق وصل لمكان الاستلام ← تم التوصيل." },
    { id: "f9", topic: "driver", q: "السواق اتأخر أعمل إيه؟", a: "كلمنا على طول أو ابعتلنا على واتساب برقم الطلب، وإحنا هنتواصل مع السواق ونبلغك بالميعاد المتوقع لوصوله أو نتصرف في بديل." },
    { id: "f10", topic: "driver", q: "السواقين بتوعكم معتمدين؟", a: "أيوه. كل السواقين موظفين في نقلة، وعربياتنا ملك الشركة، وكل سواق متسجّل عندنا ببطاقته ورخصة القيادة ورخصة العربية." },
    { id: "f11", topic: "payment", q: "بدفع إزاي؟", a: "حالياً الدفع كاش. المبلغ هو الإجمالي اللي ظهرلك وقت الطلب (أو السعر النهائي اللي خدمة العملاء أكدته معاك). الدفع الإلكتروني جاي قريب." },
    { id: "f12", topic: "cancel", q: "إزاي ألغي الطلب؟", a: "كلمنا أو ابعتلنا على واتساب برقم الطلب وإحنا نلغيه لك. الإلغاء مجاني لحد {ساعات_الإلغاء} ساعات قبل الميعاد." },
  ],
  order: {
    loaderFee: 8000,
    maxLoaders: 6,
    disclaimer: "السعر تقديري حسب المسافة والحجم، والسعر النهائي بيتأكد مع خدمة العملاء.",
    cargo: [
      { label: "ظرف / أوراق", size: "XS", icon: "file" },
      { label: "صناديق / كراسي", size: "S", icon: "box" },
      { label: "أثاث / أجهزة", size: "M", icon: "sofa" },
      { label: "عفش بيت", size: "L", icon: "home" },
    ],
  },
};

/** Fill any missing keys of a stored (possibly older) document with defaults. */
export function withDefaults(saved: Partial<AppContent> | null | undefined): AppContent {
  const s = saved ?? {};
  const d = DEFAULT_CONTENT;
  return {
    supportPhone: s.supportPhone || d.supportPhone,
    whatsapp: s.whatsapp || d.whatsapp,
    home: { ...d.home, ...(s.home ?? {}) },
    faqs: Array.isArray(s.faqs) ? s.faqs : d.faqs,
    order: { ...d.order, ...(s.order ?? {}) },
  };
}

/** tel: target — keeps short hotlines as-is, normalises mobiles. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
/** Human display: +2010… → 010…, hotlines unchanged. */
export function phoneLabel(phone: string): string {
  return phone.trim().replace(/^\+20/, "0");
}
/** wa.me digits: Egyptian 01x → 201x. */
export function waDigits(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (/^01\d{9}$/.test(d)) return "2" + d;
  if (/^1\d{9}$/.test(d)) return "20" + d;
  return d;
}
/** Fill FAQ placeholders from live settings. */
export function fillFaq(text: string, vars: { cancelHours: number; loaderFee: string }): string {
  return text.split("{ساعات_الإلغاء}").join(String(vars.cancelHours)).split("{أجر_العامل}").join(vars.loaderFee);
}
