import Link from "next/link";
import type { ReactNode } from "react";
import { formatEgp } from "@/lib/money";
import type { Quote } from "@/engines/pricing";
import {
  BOOKING_STATUS_LABEL,
  VEHICLE_STATUS_LABEL,
  type BookingStatus,
  type VehicleStatus,
} from "@/lib/constants";

type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:brightness-110 shadow-sm",
  accent: "bg-accent text-on-accent hover:brightness-105 shadow-sm",
  secondary: "bg-panel text-ink border-2 border-line-2 hover:border-primary",
  ghost: "bg-transparent text-primary hover:bg-primary-soft",
  danger: "bg-booked text-white hover:brightness-110",
};

const base =
  "tap inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-lg font-bold text-center transition disabled:opacity-40 disabled:pointer-events-none select-none";

export function Button({
  children,
  variant = "primary",
  className = "",
  full,
  ...props
}: {
  children: ReactNode;
  variant?: Variant;
  className?: string;
  full?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${base} ${variants[variant]} ${full ? "w-full" : ""} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function LinkButton({
  children,
  href,
  variant = "primary",
  className = "",
  full,
}: {
  children: ReactNode;
  href: string;
  variant?: Variant;
  className?: string;
  full?: boolean;
}) {
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${full ? "w-full" : ""} ${className}`}>
      {children}
    </Link>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-panel border border-line rounded-card shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  const map: Record<VehicleStatus, string> = {
    available: "bg-ok-soft text-ok",
    reserved: "bg-reserved-soft text-reserved",
    rented: "bg-rented-soft text-rented",
    maintenance: "bg-booked-soft text-booked",
    inactive: "bg-off-soft text-off",
  };
  const dot: Record<VehicleStatus, string> = {
    available: "bg-ok",
    reserved: "bg-reserved",
    rented: "bg-rented",
    maintenance: "bg-booked",
    inactive: "bg-off",
  };
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ${map[status]}`}>
      <span className={`w-2.5 h-2.5 rounded-full ${dot[status]}`} />
      {status === "available" ? "متاحة الآن" : VEHICLE_STATUS_LABEL[status]}
    </span>
  );
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const map: Record<BookingStatus, string> = {
    pending: "bg-rented-soft text-rented",
    confirmed: "bg-reserved-soft text-reserved",
    ready: "bg-primary-soft text-primary-ink",
    active: "bg-ok-soft text-ok",
    completed: "bg-off-soft text-off",
    cancelled: "bg-booked-soft text-booked",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${map[status]}`}>
      {BOOKING_STATUS_LABEL[status]}
    </span>
  );
}

/** Transparent, itemized price breakdown (§9, §11 — never hide fees). */
export function PriceBreakdown({ quote }: { quote: Quote }) {
  return (
    <div className="bg-panel-2 rounded-2xl p-4">
      <div className="flex flex-col gap-1.5">
        {quote.lines.map((l) => (
          <div key={l.key} className="flex justify-between text-[15px]">
            <span className={l.amount < 0 ? "text-ok font-semibold" : "text-ink-2"}>{l.labelAr}</span>
            <span className={l.amount < 0 ? "text-ok font-bold" : "font-semibold"}>
              {l.amount < 0 ? "−" : ""}
              {formatEgp(Math.abs(l.amount))}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-dashed border-line-2 flex justify-between items-center">
        <span className="font-bold text-lg">الإجمالي</span>
        <span className="font-extrabold text-2xl text-emph">{formatEgp(quote.total)}</span>
      </div>
      {quote.deposit > 0 && (
        <p className="mt-2 text-sm text-muted">
          + تأمين مسترد {formatEgp(quote.deposit)} (يُرد بعد فحص العربية)
        </p>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-16 px-6">
      <div className="text-5xl mb-4">🚚</div>
      <h3 className="text-xl font-bold">{title}</h3>
      {subtitle && <p className="text-muted mt-2">{subtitle}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block mb-2 font-bold text-ink">{label}</span>
      {children}
      {hint && <span className="block mt-1.5 text-sm text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-2xl border-2 border-line-2 bg-panel px-4 py-3.5 text-lg outline-none focus:border-primary tap";
