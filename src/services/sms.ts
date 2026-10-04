/**
 * SMS provider abstraction. MVP ships a "console" adapter that logs the OTP to
 * the server (no SMS sent). Real providers (SMSMisr, Vodafone, WhatsApp OTP…)
 * implement the same interface and are selected via SMS_PROVIDER — no other code
 * changes (architecture §20, §14.9).
 */
export interface SmsProvider {
  send(to: string, message: string): Promise<void>;
}

const consoleProvider: SmsProvider = {
  async send(to, message) {
    // eslint-disable-next-line no-console
    console.log(`\n[SMS → ${to}] ${message}\n`);
  },
};

// Register future adapters here (keyed by SMS_PROVIDER).
const providers: Record<string, SmsProvider> = {
  console: consoleProvider,
};

export function getSms(): SmsProvider {
  const name = process.env.SMS_PROVIDER ?? "console";
  return providers[name] ?? consoleProvider;
}
