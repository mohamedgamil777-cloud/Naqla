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

/** Fire a notification without ever breaking the calling flow (log adapter in MVP). */
export function fireNotify(to: string | null | undefined, message: string, channel: NotifyChannel = "whatsapp"): void {
  if (!to) return;
  void getNotifier()
    .notify(channel, to, message)
    .catch(() => {
      /* never let notifications break an order */
    });
}

/** Customer-facing text for each A→B delivery-order event. */
export function deliveryCustomerMessage(
  event: "created" | "confirmed" | "assigned" | "en_route" | "completed",
  code: string,
  driverName?: string | null
): string {
  switch (event) {
    case "created":
      return `استلمنا طلبك ✅\nرقم الطلب: ${code}\nهنتواصل معاك لتأكيد الميعاد والسواق.`;
    case "confirmed":
      return `تم تأكيد طلبك ✅\nرقم الطلب: ${code}\nجاري البحث عن سواق ليك.`;
    case "assigned":
      return `تم تعيين سواق لطلبك ✅\nرقم الطلب: ${code}${driverName ? `\nالسواق: ${driverName}` : ""}\nهيكون في الطريق في ميعاد التوصيل.`;
    case "en_route":
      return `السواق في الطريق إليك دلوقتي 🚚\nرقم الطلب: ${code}${driverName ? `\nالسواق: ${driverName}` : ""}`;
    case "completed":
      return `تم توصيل طلبك 🎉\nرقم الطلب: ${code}\nيا ريت تقيّم الخدمة من التطبيق. شكراً لاستخدامك نقلة!`;
  }
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
