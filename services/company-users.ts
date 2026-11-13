/**
 * Logins of company users: a username + password on the account behind the member's phone.
 * The phone stays on the account (password-reset codes go to it). The company admin (owner)
 * or staff set them; the employee signs in with the username.
 */
import { createUserWithPassword, getLoginAccount, setPassword, setUsername } from "@/db/lib/accounts";
import { hashPassword } from "@/lib/password";
import { passwordProblem } from "@/lib/password-policy";
import { normalizeUsername, usernameProblem } from "@/lib/username";

export type CompanyLoginInput = {
  phone: string;
  name: string | null;
  username: string;
  /** null keeps the current password (an existing account must already have one) */
  password: string | null;
  /** staff may replace a password the person already has; a company admin may not (no account takeover —
   *  the employee changes their own with a code sent to their phone) */
  mayReplacePassword?: boolean;
};

/** null when done, else an Arabic message for the form. */
export async function setCompanyUserLogin(input: CompanyLoginInput): Promise<string | null> {
  const nameProblem = usernameProblem(input.username);
  if (nameProblem) return nameProblem;
  const username = normalizeUsername(input.username);
  if (input.password) {
    const problem = passwordProblem(input.password, "customer");
    if (problem) return problem;
  }

  let acct = await getLoginAccount(input.phone);
  if (acct && acct.role !== "customer") return "الرقم ده لحساب موظف أو سواق في انقلي، استخدم رقم تاني.";
  if (!acct) {
    if (!input.password) return "اكتب كلمة سر للمستخدم.";
    const res = await createUserWithPassword({
      phone: input.phone,
      name: input.name,
      role: "customer",
      passwordHash: await hashPassword(input.password),
      verified: true, // the company vouches for its employee's number
    });
    acct = await getLoginAccount(input.phone);
    if (!acct) return "حصلت مشكلة، جرّب تاني.";
    if (res.created) {
      if (!(await setUsername(acct.id, username))) return taken(username);
      return null;
    }
    // someone created this number a moment ago: treat it as an existing account below
  }
  if (input.password && acct.passwordHash && !input.mayReplacePassword) {
    return "الشخص ده عنده كلمة سر بالفعل. يقدر يغيّرها بنفسه من «نسيت كلمة السر؟» بكود على موبايله.";
  }
  if (!(await setUsername(acct.id, username))) return taken(username);
  if (input.password) await setPassword(acct.id, await hashPassword(input.password));
  else if (!acct.passwordHash) return "الحساب ده لسه ملوش كلمة سر، اكتب كلمة سر.";
  return null;
}

const taken = (username: string) => `اسم المستخدم «${username}» مستخدم قبل كده، اختار اسم تاني.`;
