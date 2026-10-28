/**
 * SMS provider abstraction. MVP ships a "console" adapter that logs the OTP to
 * the server (no SMS sent). Real providers (SMSMisr, Vodafone, WhatsApp OTP…)
 * implement the same interface and are selected via SMS_PROVIDER — no other code
 * changes (architecture §20, §14.9).
 */
import { getEnv, SMS_PROVIDERS } from "@/lib/env";

export interface SmsProvider {
  send(to: string, message: string): Promise<void>;
}

const consoleProvider: SmsProvider = {
  async send(to, message) {
    // eslint-disable-next-line no-console
    console.log(`\n[SMS → ${to}] ${message}\n`);
  },
};

// Register future adapters here (keyed by SMS_PROVIDER) and add the name to SMS_PROVIDERS in lib/env.ts.
const providers: Record<(typeof SMS_PROVIDERS)[number], SmsProvider> = {
  console: consoleProvider,
};

/** The configured adapter. Unknown names never reach here: lib/env rejects them (no silent console fallback). */
export function getSms(): SmsProvider {
  const name = getEnv().SMS_PROVIDER;
  const provider = providers[name];
  if (!provider) throw new Error(`SMS provider "${name}" is not registered`);
  return provider;
}
