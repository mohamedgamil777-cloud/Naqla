import { labelDateArabic, labelTime } from "@/lib/time";
import { Icon } from "@/components/Icons";
import type { DeliveryOrderDTO } from "@/data/types";

/** Proof of delivery: who received it, when, and the driver's photo (tap to open). */
export function PodView({ o, className = "" }: { o: Pick<DeliveryOrderDTO, "podName" | "podPhoto" | "podAt">; className?: string }) {
  if (!o.podName && !o.podPhoto) return null;
  return (
    <details className={`group bg-ok-soft/60 border border-ok/20 rounded-2xl px-3.5 py-2.5 ${className}`}>
      <summary className="list-none cursor-pointer flex items-center gap-2 text-sm">
        <Icon name="checkCircle" className="w-5 h-5 text-ok shrink-0" />
        <span className="flex-1 min-w-0">
          <span className="font-bold">إثبات التسليم:</span> استلمها <span className="font-extrabold">{o.podName ?? "—"}</span>
          {o.podAt && (
            <span className="text-muted">
              {" "}
              · {labelDateArabic(o.podAt)} {labelTime(o.podAt)}
            </span>
          )}
        </span>
        {o.podPhoto && <span className="text-primary font-bold shrink-0 group-open:hidden">الصورة</span>}
      </summary>
      {o.podPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={o.podPhoto} alt="صورة التسليم" loading="lazy" className="mt-2.5 w-full max-h-80 object-contain rounded-xl bg-panel" />
      )}
    </details>
  );
}
