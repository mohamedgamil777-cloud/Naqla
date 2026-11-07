"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";
import { LocationHelp } from "@/components/delivery-estimator/LocationHelp";
import { DRAFT_KEY, type OrderDraft } from "@/components/delivery-estimator/model";
import { getMyLocation, locateMessage, type LatLng, type LocateFailure } from "@/lib/geolocation";
import { loadGoogleMaps, reverseGeocode } from "@/lib/google-maps";

type Stop = "a" | "b";
type Field = { text: string; point: LatLng | null };
const EMPTY: Field = { text: "", point: null };
const HERE = "موقعي الحالي";

/** Home-page start of an order: the two addresses (and any GPS spot) go to /estimate as a draft
 *  the estimator picks up. Phone: stacked fields. Tablet and up: one row — pickup · swap · drop-off · price. */
export function QuoteStarter({ maps = null }: { maps?: { apiKey: string } | null }) {
  const router = useRouter();
  const [fields, setFields] = useState<Record<Stop, Field>>({ a: EMPTY, b: EMPTY });
  const [locating, setLocating] = useState<Stop | null>(null);
  const [locateErr, setLocateErr] = useState<string | null>(null);
  const [locateFail, setLocateFail] = useState<LocateFailure | null>(null);
  const [helpFor, setHelpFor] = useState<Stop | null>(null);
  const lookupSeq = useRef(0);

  function setText(stop: Stop, text: string) {
    // typing replaces a GPS spot with the typed address
    setFields((f) => ({ ...f, [stop]: { text, point: null } }));
  }

  /** A GPS fix for a stop: keep the point, then show its street address. */
  function placeAt(stop: Stop, point: LatLng) {
    setFields((f) => ({ ...f, [stop]: { text: HERE, point } }));
    if (!maps) return;
    const seq = ++lookupSeq.current;
    loadGoogleMaps(maps.apiKey)
      .then(() => reverseGeocode(point))
      .then((found) => {
        if (!found || seq !== lookupSeq.current) return;
        // only if the customer hasn't typed over it meanwhile
        setFields((f) => (f[stop].point === point ? { ...f, [stop]: { text: found, point } } : f));
      })
      .catch(() => {}); // «موقعي الحالي» stays; the pin is what matters
  }

  function findMe(stop: Stop) {
    setLocating(stop);
    setLocateErr(null);
    setLocateFail(null);
    getMyLocation()
      .then((point) => placeAt(stop, point))
      .catch((why: LocateFailure) => {
        setLocateErr(locateMessage(why));
        setLocateFail(why);
        setHelpFor(stop); // straight to the fix steps
      })
      .finally(() => setLocating(null));
  }

  function start(e: React.FormEvent) {
    e.preventDefault();
    const draft: Partial<OrderDraft> = {
      pickupAddr: fields.a.text.trim(),
      dropoffAddr: fields.b.text.trim(),
      pickupPoint: fields.a.point,
      dropoffPoint: fields.b.point,
    };
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // storage blocked: the customer types the addresses again on the next page
    }
    router.push("/estimate");
  }

  function swap() {
    setFields((f) => ({ a: f.b, b: f.a }));
  }

  const input =
    "w-full rounded-xl border border-line-2 bg-panel ps-4 pe-12 py-3 text-base outline-none placeholder:text-muted/80 focus:border-primary focus:ring-3 focus:ring-primary/15";

  function stopField(stop: Stop, label: string, pinClass: string) {
    const busy = locating === stop;
    return (
      <div className="flex-1 min-w-0">
        <label htmlFor={`qs-${stop}`} className="flex items-center gap-1.5 mb-1.5 text-sm font-bold">
          <Icon name="mapPin" className={`w-5 h-5 ${pinClass}`} strokeWidth={2.2} />
          {label}
        </label>
        <div className="relative">
          <input
            id={`qs-${stop}`}
            className={input}
            value={fields[stop].text}
            onChange={(e) => setText(stop, e.target.value)}
            placeholder="المنطقة، الشارع، رقم العمارة"
            autoComplete={stop === "a" ? "street-address" : "off"}
          />
          <button
            type="button"
            onClick={() => findMe(stop)}
            disabled={locating !== null}
            aria-label={`حدد ${label} بموقعي الحالي (GPS)`}
            title="موقعي الحالي"
            className={`absolute end-1.5 top-1/2 -translate-y-1/2 w-9 h-9 grid place-items-center rounded-lg cursor-pointer disabled:cursor-wait ${
              fields[stop].point ? "bg-primary text-white" : "text-primary hover:bg-primary-soft"
            }`}
          >
            <Icon name="locate" className={`w-5 h-5 ${busy ? "animate-pulse" : ""}`} strokeWidth={2.1} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <form
        onSubmit={start}
        className="bg-panel rounded-2xl shadow-[0_12px_36px_rgba(16,32,28,0.10)] border border-line/70 p-4 md:p-5"
      >
        <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4">
          {stopField("a", "مكان الاستلام", "text-booked")}

          <button
            type="button"
            onClick={swap}
            aria-label="بدّل مكان الاستلام والتسليم"
            className="self-center md:self-end md:mb-1 w-11 h-11 shrink-0 grid place-items-center rounded-full bg-primary-soft text-primary hover:bg-primary hover:text-white cursor-pointer -my-1 md:my-0"
          >
            <Icon name="swapH" className="w-5 h-5 rotate-90 md:rotate-0" strokeWidth={2.2} />
          </button>

          {stopField("b", "مكان التسليم", "text-primary")}

          <button
            type="submit"
            className="tap mt-1 md:mt-0 md:w-56 shrink-0 rounded-xl bg-accent text-on-accent font-extrabold text-lg flex items-center justify-center gap-2 cursor-pointer shadow-[0_6px_16px_rgba(242,165,65,0.35)] hover:brightness-95"
          >
            اعرف السعر
            <Icon name="arrowLeft" className="w-5 h-5" strokeWidth={2.4} />
          </button>
        </div>
        {locateErr && (
          <p role="alert" className="mt-3 text-sm text-booked flex items-start gap-1.5">
            <Icon name="alert" className="w-4 h-4 mt-0.5 shrink-0" />
            {locateErr}
          </p>
        )}
      </form>

      <LocationHelp
        failure={locateFail}
        open={helpFor !== null}
        onClose={() => setHelpFor(null)}
        onRetry={() => {
          const stop = helpFor ?? "a";
          setHelpFor(null);
          findMe(stop);
        }}
        onLocated={(point) => {
          const stop = helpFor ?? "a";
          setHelpFor(null);
          setLocateErr(null);
          setLocateFail(null);
          placeAt(stop, point);
        }}
        onPickOnMap={null}
      />
    </>
  );
}
