/** Login names for company users — pure, shared by the forms and the server. */

/** 3–30 characters: English letters, digits, dot, dash, underscore; starts with a letter (so it never looks like a phone). */
export const USERNAME_RE = /^[a-z][a-z0-9._-]{2,29}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/** null when acceptable, else an Arabic message. */
export function usernameProblem(raw: string): string | null {
  const u = normalizeUsername(raw);
  if (!USERNAME_RE.test(u))
    return "اسم المستخدم من 3 لـ 30 حرف إنجليزي أو رقم (ممكن . _ -)، ويبدأ بحرف. مثلاً: ahmed.nour";
  return null;
}
