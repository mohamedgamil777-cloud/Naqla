/**
 * Egyptian mobile number validation & normalization.
 *
 * Egyptian mobiles are 11 digits starting 01, second digit ∈ {0,1,2,5}:
 *   010x, 011x, 012x, 015x  (Vodafone/Etisalat/Orange/WE).
 * We accept common input shapes and normalize to E.164 (+20...).
 */

const LOCAL_RE = /^01[0125]\d{8}$/;

/** Strip spaces, dashes, and a leading +20 / 0020 / 20 to a bare 11-digit local number. */
export function toLocal(raw: string): string | null {
  const digits = raw.replace(/[\s\-()]/g, "");
  let local = digits;
  if (local.startsWith("+20")) local = "0" + local.slice(3);
  else if (local.startsWith("0020")) local = "0" + local.slice(4);
  else if (local.startsWith("20") && local.length === 12) local = "0" + local.slice(2);
  if (LOCAL_RE.test(local)) return local;
  return null;
}

export function isValidEgyptianMobile(raw: string): boolean {
  return toLocal(raw) !== null;
}

/** Normalize to E.164, e.g. "0100 123 4567" -> "+201001234567". Throws on invalid. */
export function toE164(raw: string): string {
  const local = toLocal(raw);
  if (!local) throw new Error("INVALID_PHONE");
  return "+20" + local.slice(1);
}

/** For WhatsApp deep links: bare international digits, e.g. "201001234567". */
export function toWhatsappDigits(raw: string): string {
  return toE164(raw).replace("+", "");
}
