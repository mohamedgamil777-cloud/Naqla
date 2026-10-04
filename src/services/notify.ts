/**
 * Notification abstraction (architecture §20, §21). A single interface so SMS /
 * WhatsApp / Push adapters can be added later without touching booking code.
 * MVP logs notifications; the WhatsApp message templates are ready to wire up.
 */
import type { BookingDTO } from "@/data/types";
import { formatEgp } from "@/lib/money";
import { labelDateArabic, labelTime } from "@/lib/time";

export type NotifyChannel = "sms" | "whatsapp" | "push";

export interface NotificationProvider {
  notify(channel: NotifyChannel, to: string, message: string): Promise<void>;
}

const logProvider: NotificationProvider = {
  async notify(channel, to, message) {
    // eslint-disable-next-line no-console
    console.log(`\n[NOTIFY:${channel} → ${to}]\n${message}\n`);
  },
};

export function getNotifier(): NotificationProvider {
  return logProvider;
}

/** WhatsApp/SMS confirmation text (architecture §21). */
export function bookingConfirmedMessage(b: BookingDTO): string {
  return [
    "تم تأكيد حجزك ✅",
    `رقم الحجز: ${b.code}`,
    `العربية: ${b.vehicleName}`,
    `ميعاد الاستلام: ${labelDateArabic(b.startsAt)} — ${labelTime(b.startsAt)}`,
    `المكان: ${b.branchName}`,
    `الإجمالي: ${formatEgp(b.priceSnapshot.total)}`,
  ].join("\n");
}
