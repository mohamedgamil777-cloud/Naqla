/** Arabic text for auth API error codes (website forms; the mobile app has its own copy in api.ts). */
export function authErrorText(body: { error?: string; message?: string; retryAfterMinutes?: string; account?: string }): string {
  switch (body.error) {
    case "INVALID_PHONE":
      return "رقم الموبايل مش صحيح. اكتبه كده: 01xxxxxxxxx";
    case "INVALID_CREDENTIALS":
      return "الرقم أو كلمة السر غلط.";
    case "ACCOUNT_LOCKED":
      return `محاولات غلط كتير — جرّب تاني بعد ${body.retryAfterMinutes ?? 15} دقيقة، أو كلّم خدمة العملاء.`;
    case "PASSWORD_NOT_SET":
      return body.account === "customer"
        ? "حسابك لسه ملوش كلمة سر — اختار «حساب جديد» واعمل كلمة سر بنفس رقمك."
        : "الحساب ده لسه ملوش كلمة سر — اطلبها من الإدارة.";
    case "PHONE_TAKEN":
      return "الرقم ده عليه حساب بالفعل — ادخل بكلمة السر، ولو نسيتها كلّم خدمة العملاء.";
    case "STAFF_ACCOUNT":
      return "الرقم ده لحساب موظف/سواق — كلمة السر بتتعمل من الإدارة.";
    case "WEAK_PASSWORD":
      return body.message ?? "كلمة السر ضعيفة، اختار حاجة أطول.";
    case "INVALID_NAME":
      return "اكتب اسمك (حرفين على الأقل).";
    default:
      return "حصلت مشكلة، جرّب تاني.";
  }
}
