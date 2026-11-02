import type { DeliveryOrderStatus } from "@/types";

export const ORDER_STATUS: Record<DeliveryOrderStatus, { label: string; cls: string }> = {
  new: { label: "جديد", cls: "bg-rented-soft text-rented" },
  confirmed: { label: "مؤكد · جاري البحث عن سائق", cls: "bg-reserved-soft text-reserved" },
  assigned: { label: "تم تعيين سائق", cls: "bg-primary-soft text-primary-ink" },
  en_route: { label: "السائق في الطريق للاستلام", cls: "bg-ok-soft text-ok" },
  arrived: { label: "السائق وصل للاستلام", cls: "bg-ok-soft text-ok" },
  completed: { label: "تم التوصيل", cls: "bg-ok-soft text-ok" },
  cancelled: { label: "ملغي", cls: "bg-booked-soft text-booked" },
};

export const isOpenOrder = (status: DeliveryOrderStatus) => status !== "completed" && status !== "cancelled";

export const isOnTheRoad = (status: DeliveryOrderStatus) =>
  status === "assigned" || status === "en_route" || status === "arrived";
