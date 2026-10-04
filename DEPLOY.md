# نشر تطبيق نقلة على الإنترنت (Deploy)

الهدف: لينك عام (https) تبعته لأصحابك يجربوا التطبيق من أي موبايل، والبيانات بتتسجّل وما بتتمسحش.

نستخدم خدمتين مجانيتين:
- **Supabase** = قاعدة البيانات (الداتا الدائمة).
- **Vercel** = استضافة التطبيق (اللينك العام).

---

## الخطوة 1 — قاعدة البيانات (Supabase)

1. اعمل حساب على <https://supabase.com> واعمل **New project** (اختَر Region قريب: `eu-central-1` أو `eu-west-1`). اكتب باسورد قوي لقاعدة البيانات واحتفظ بيه.
2. استنى دقيقتين لحد ما المشروع يجهز.
3. من القايمة: **SQL Editor → New query**.
4. افتح الملف `deploy/setup.sql` من المشروع، انسخ **كل** محتواه، الصقه في المحرر، ودوس **Run**.
   - ده بيعمل كل الجداول + بيانات تجريبية (فرع، عربيات، أسعار، كوبون ترحيب).
5. هات نص الاتصال: **Settings → Database → Connection string → Transaction pooler**.
   - شكله: `postgresql://postgres.xxxx:PASSWORD@aws-0-...pooler.supabase.com:6543/postgres`
   - بدّل `PASSWORD` بالباسورد بتاع قاعدة البيانات. ده هو `DATABASE_URL`.

> نصيحة: لو تحب، أنا أقدر أعمل الخطوات دي كلها أوتوماتيك لو ربطت حساب Supabase بالكونيكتور (تحط الـ access token في إعدادات Supabase connector). ساعتها قوللي وأنا أكمّل.

---

## الخطوة 2 — رفع الكود على GitHub

Vercel بتسحب الكود من GitHub.

1. اعمل حساب على <https://github.com> لو مالكش.
2. اعمل **New repository** باسم `naqla` (خليه Private).
3. من مجلد المشروع `D:\Business\Van` شغّل الأوامر دي (مرة واحدة):

```bash
git init
git add .
git commit -m "Naqla MVP"
git branch -M main
git remote add origin https://github.com/<حسابك>/naqla.git
git push -u origin main
```

---

## الخطوة 3 — النشر على Vercel

1. اعمل حساب على <https://vercel.com> بحساب GitHub بتاعك.
2. **Add New → Project → Import** واختار ريبو `naqla`.
3. قبل ما تدوس Deploy، افتح **Environment Variables** وضيف:

| Name | Value |
|------|-------|
| `DATABASE_URL` | نص الاتصال من Supabase (خطوة 1) |
| `AUTH_SECRET` | نص عشوائي طويل (٣٢ حرف على الأقل) — متحطّش قيمة حقيقية في الريبو العام |
| `ADMIN_PASSCODE` | كلمة سر لوحة الإدارة (اختار واحدة قوية وشاركها مع فريقك بس) |

4. دوس **Deploy** واستنى دقيقتين.
5. هتاخد لينك زي `https://naqla.vercel.app` — ده اللي تبعته لأصحابك.

روابط مهمة بعد النشر:
- التطبيق للعميل: `/`
- حساب سعر التوصيل: `/estimate`
- شاشة السائق: `/driver`
- لوحة الإدارة: `/admin`

---

## ملاحظات مهمة

- **لوحة الإدارة `/admin` محمية بكلمة سر** (`ADMIN_PASSCODE`). لو ما ظبطتهاش، الديفولت للتجربة المحلية هو `naqla2026` — غيّرها في Vercel قبل النشر. شاشة الدخول على `/admin-login`.
- الدخول (OTP): في وضع التجربة الكود بيظهر على الشاشة، فأصحابك يقدروا يسجّلوا دخول من غير SMS حقيقي.
- عشان SMS حقيقي لاحقاً: نضيف مزوّد خدمة ونظبط `SMS_PROVIDER`.
