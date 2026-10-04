"use client";
import { useEffect, useState } from "react";

export interface NotifyTrip {
  code: string;
  startMs: number;
  timeLabel: string;
  dayLabel: string;
  vehicleName: string;
  place: string;
}

const HALF_HOUR = 30 * 60 * 1000;

/**
 * Driver reminders. Two layers, both very simple:
 *  1) A big banner that always shows the very next trip.
 *  2) Optional phone notifications: one tap to allow, then — while the app is
 *     open — a reminder fires half an hour before each trip and at its time.
 */
export function DriverNotify({ trips }: { trips: NotifyTrip[] }) {
  const [now, setNow] = useState(() => Date.now());
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    if (typeof Notification === "undefined") setPerm("unsupported");
    else setPerm(Notification.permission);
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Schedule local reminders for trips within the next 24h (while page is open).
  useEffect(() => {
    if (perm !== "granted" || typeof Notification === "undefined") return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let fired: Record<string, boolean> = {};
    try {
      fired = JSON.parse(localStorage.getItem("naqla_driver_fired") || "{}");
    } catch {}
    const save = () => {
      try {
        localStorage.setItem("naqla_driver_fired", JSON.stringify(fired));
      } catch {}
    };
    const notify = (key: string, title: string, body: string) => {
      if (fired[key]) return;
      fired[key] = true;
      save();
      try {
        new Notification(title, { body, tag: key });
      } catch {}
    };
    const nowMs = Date.now();
    for (const t of trips) {
      const soon = t.startMs - HALF_HOUR;
      if (soon > nowMs && soon - nowMs < 24 * 60 * 60 * 1000) {
        timers.push(
          setTimeout(
            () => notify(`${t.code}-soon`, "🔔 رحلة قربت", `بعد نص ساعة: ${t.vehicleName} الساعة ${t.timeLabel} — ${t.place}`),
            soon - nowMs
          )
        );
      }
      if (t.startMs > nowMs && t.startMs - nowMs < 24 * 60 * 60 * 1000) {
        timers.push(
          setTimeout(
            () => notify(`${t.code}-now`, "🚦 معاد الرحلة دلوقتي", `${t.vehicleName} — ${t.place}`),
            t.startMs - nowMs
          )
        );
      }
    }
    return () => timers.forEach(clearTimeout);
  }, [perm, trips]);

  const next = trips
    .filter((t) => t.startMs + 2 * 60 * 60 * 1000 > now)
    .sort((a, b) => a.startMs - b.startMs)[0];

  const started = next && next.startMs <= now;

  return (
    <div className="flex flex-col gap-3">
      {next ? (
        <div className="bg-primary text-white rounded-card p-4 shadow-sm">
          <div className="text-sm font-bold opacity-90">{started ? "🚗 رحلتك دلوقتي" : "🔔 رحلتك الجاية"}</div>
          <div className="text-2xl font-extrabold mt-1">
            {next.dayLabel} — {next.timeLabel}
          </div>
          <div className="text-lg font-bold mt-0.5">{next.vehicleName}</div>
          <div className="text-sm opacity-90 mt-0.5">{next.place}</div>
        </div>
      ) : (
        <div className="bg-ok-soft text-ok rounded-card p-4 text-center font-bold text-lg">
          مفيش رحلات جاية دلوقتي 👍
        </div>
      )}

      {perm === "default" && (
        <button
          onClick={async () => {
            try {
              setPerm(await Notification.requestPermission());
            } catch {}
          }}
          className="w-full rounded-2xl bg-accent text-accent-ink py-3.5 text-lg font-extrabold tap"
        >
          🔔 شغّل التنبيهات عشان تفكّرك بالرحلة
        </button>
      )}
      {perm === "granted" && (
        <div className="text-center text-sm text-ok font-bold">✅ التنبيهات شغّالة — هنفكّرك قبل كل رحلة</div>
      )}
      {perm === "denied" && (
        <div className="text-center text-sm text-muted">التنبيهات مقفولة. افتح إعدادات الموبايل لو عايز تشغّلها.</div>
      )}
    </div>
  );
}
