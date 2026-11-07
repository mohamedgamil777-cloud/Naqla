"use client";
/**
 * Customer A→B order form: places → time → vehicle → details, with a live server price.
 * This component owns the order state; each section is a focused child component.
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cairoDateISO } from "@/lib/client-time";
import { geocodeAddress, loadGoogleMaps, reverseGeocode } from "@/lib/google-maps";
import { getMyLocation, locateMessage, type LocateFailure } from "@/lib/geolocation";
import { useTyping } from "@/hooks/useTyping";
import type { Quote } from "@/engines/pricing";
import { AuthGate } from "./AuthGate";
import { LocationHelp } from "./LocationHelp";
import { ExtrasSection } from "./ExtrasSection";
import { CompanyBanner, OrderPlaced, Stepper } from "./OrderHeader";
import { OrderBar } from "./OrderBar";
import {
  DistanceBar,
  LocateButton,
  MapPanel,
  MapToggleButton,
  PlacesCard,
  SwapDivider,
} from "./PlacesSection";
import { ScheduleSection } from "./ScheduleSection";
import { SavedAddressChips, StopFields } from "./StopFields";
import { CargoHints, VehiclePicker } from "./VehicleSection";
import { useDeliveryMap } from "./use-delivery-map";
import {
  DRAFT_KEY,
  ORDER_ERROR,
  addDaysISO,
  cairoNowMinutes,
  composeDetails,
  emptyStop,
  parseDetails,
  roadKm,
  slotMinutes,
  timeSlots,
  type AccountInfo,
  type LatLng,
  type OrderDraft,
  type OrderOptions,
  type SavedAddr,
  type SizeOpt,
  type Stop,
  type StopState,
} from "./model";

export type { AccountInfo, OrderOptions, SavedAddr } from "./model";

type DeliveryEstimatorProps = {
  sizes: SizeOpt[];
  center: LatLng;
  initialSizeCode?: string;
  /** per-person loader fee (piastres), shown under the counter */
  loaderFee?: number;
  options: OrderOptions;
  /** logged-in customer: company (B2B) + saved addresses */
  account?: AccountInfo;
  /** Google Maps (search, pins, reverse lookup); null → typed addresses and a hand-set distance */
  maps: { apiKey: string; mapId: string } | null;
};

const GENERIC_ERROR = "حصلت مشكلة، حاول تاني.";

function goTo(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function DeliveryEstimator({
  sizes,
  center,
  initialSizeCode,
  loaderFee,
  options,
  account,
  maps,
}: DeliveryEstimatorProps) {
  const router = useRouter();
  const typing = useTyping(); // keyboard up → hide the sticky order bar
  const allSlots = timeSlots(options.hours.open, options.hours.close);
  const today = cairoDateISO(0);
  // Today only offers times that are still bookable (now + minimum notice).
  const slotsFor = (day: string) =>
    day === today
      ? allSlots.filter((t) => slotMinutes(t) >= cairoNowMinutes() + options.leadHours * 60)
      : allSlots;
  const firstDay = slotsFor(today).length ? today : addDaysISO(today, 1);

  // ---- places ----
  const [stops, setStops] = useState<Record<Stop, StopState>>({ a: emptyStop(), b: emptyStop() });
  const updateStop = (stop: Stop, patch: Partial<StopState>) =>
    setStops((all) => ({ ...all, [stop]: { ...all[stop], ...patch } }));
  /** a reverse lookup is running for this stop's pin */
  const [resolving, setResolving] = useState<Record<Stop, boolean>>({ a: false, b: false });
  const lookupSeq = useRef<Record<Stop, number>>({ a: 0, b: 0 });
  // straight-line × road factor from the two pins; a hand-set value without maps
  const [km, setKm] = useState(5);
  const [locating, setLocating] = useState(false);
  const [locateErr, setLocateErr] = useState<string | null>(null);
  const [locateFail, setLocateFail] = useState<LocateFailure | null>(null);
  const [locateHelpOpen, setLocateHelpOpen] = useState(false);
  const [addrError, setAddrError] = useState(false);
  const [saved, setSaved] = useState<SavedAddr[]>(account?.saved ?? []);
  const [savedMsg, setSavedMsg] = useState<{ stop: Stop; text: string } | null>(null);

  // ---- map ----
  const mapEl = useRef<HTMLDivElement>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [activeStop, setActiveStop] = useState<Stop>("a");
  /** no key or Google refused it → plain address fields, no pins required */
  const plain = !maps || mapError;

  /** A stop got a point (map tap, dragged pin, my location): store it, then fetch its street address. */
  function locate(stop: Stop, point: LatLng, address?: string) {
    updateStop(stop, address ? { point, address } : { point });
    if (stop === "a" && !stops.b.point) setActiveStop("b"); // the next tap places the drop-off
    if (address || !maps) return;
    const seq = ++lookupSeq.current[stop];
    setResolving((r) => ({ ...r, [stop]: true }));
    loadGoogleMaps(maps.apiKey)
      .then(() => reverseGeocode(point))
      .then((found) => {
        if (seq !== lookupSeq.current[stop]) return; // the pin moved again meanwhile
        updateStop(stop, { address: found ?? "مكان محدد على الخريطة" });
      })
      .catch(() => {
        if (seq === lookupSeq.current[stop]) updateStop(stop, { address: "مكان محدد على الخريطة" });
      })
      .finally(() => {
        if (seq === lookupSeq.current[stop]) setResolving((r) => ({ ...r, [stop]: false }));
      });
  }

  useDeliveryMap({
    apiKey: maps?.apiKey ?? "",
    mapId: maps?.mapId ?? "DEMO_MAP_ID",
    open: mapOpen && !plain,
    container: mapEl,
    center,
    points: { a: stops.a.point, b: stops.b.point },
    active: activeStop,
    onPick: (stop, point) => locate(stop, point),
    onError: () => setMapError(true),
  });

  // ---- vehicle ----
  const [sizeId, setSizeId] = useState(
    () =>
      (sizes.find((s) => s.sizeCode === initialSizeCode) ?? sizes.find((s) => s.sizeCode === "S") ?? sizes[0])
        ?.id ?? "",
  );
  const [recommended, setRecommended] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [vehicleTouched, setVehicleTouched] = useState(Boolean(initialSizeCode));

  // ---- time ----
  const [date, setDate] = useState(firstDay);
  const availableSlots = slotsFor(date);
  const [time, setTime] = useState(() => {
    const first = slotsFor(firstDay);
    return first.includes("10:00") ? "10:00" : (first[0] ?? "10:00");
  });
  const [timeTouched, setTimeTouched] = useState(false);

  // ---- details + price ----
  const [loaders, setLoaders] = useState(0);
  const [notes, setNotes] = useState("");
  const [appliedPromo, setAppliedPromo] = useState("");
  const [promoMsg, setPromoMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [pricing, setPricing] = useState(false);

  // ---- ordering ----
  const [loggedIn, setLoggedIn] = useState(Boolean(account?.loggedIn));
  const [authOpen, setAuthOpen] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [orderErr, setOrderErr] = useState<string | null>(null);

  // Changing the day can make the chosen time unavailable → jump to the first free one.
  useEffect(() => {
    if (availableSlots.length && !availableSlots.includes(time)) setTime(availableSlots[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the day changes
  }, [date]);

  // Desktop has room for the map: show it from the start instead of behind the toggle.
  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) setMapOpen(true);
  }, []);

  const stopReady = (stop: StopState) => stop.address.trim().length >= 3 && (plain || !!stop.point);
  const placesDone = stopReady(stops.a) && stopReady(stops.b);

  // Once both stops are set, drop the "missing place" warning.
  useEffect(() => {
    if (addrError && placesDone) {
      setAddrError(false);
      setOrderErr(null);
    }
  }, [addrError, placesDone]);

  useEffect(() => {
    if (stops.a.point && stops.b.point) setKm(roadKm(stops.a.point, stops.b.point));
  }, [stops.a.point, stops.b.point]);

  // Addresses typed on the home page: put each on the map (Google's best match), or keep the text.
  useEffect(() => {
    const draft = takeDraft();
    if (!draft) return;
    for (const [stop, text] of [
      ["a", draft.pickupAddr],
      ["b", draft.dropoffAddr],
    ] as const) {
      const typed = text?.trim();
      if (!typed) continue;
      updateStop(stop, { address: typed });
      if (!maps) continue;
      loadGoogleMaps(maps.apiKey)
        .then(() => geocodeAddress(typed))
        .then((hit) => hit && updateStop(stop, { point: hit.point, address: hit.address }))
        .catch(() => {}); // the customer picks it on the map instead
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);

  // Live price: re-quote on the server whenever an input changes (debounced).
  const canPrice = Boolean(sizeId) && (plain || Boolean(stops.a.point && stops.b.point));
  useEffect(() => {
    if (!canPrice) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setPricing(true);
    const timer = setTimeout(async () => {
      try {
        const r = await fetch("/api/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryId: sizeId, km, loaders, promoCode: appliedPromo || null }),
        });
        if (!r.ok) throw new Error(`estimate ${r.status}`);
        const j = await r.json();
        if (cancelled) return;
        if (j.quote) setQuote(j.quote);
        if (appliedPromo) {
          setPromoMsg(
            j.promoApplied
              ? { ok: true, text: "تم تطبيق الكوبون" }
              : { ok: false, text: "الكوبون مش صحيح أو مش مطابق للشروط" },
          );
        }
      } catch {
        // keep the last good price; the order itself is priced again on the server
      } finally {
        if (!cancelled) setPricing(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [canPrice, sizeId, km, loaders, appliedPromo]);

  function pickHint(size: string) {
    setHint(size);
    const match = sizes.find((s) => s.sizeCode === size);
    if (match) {
      setSizeId(match.id);
      setRecommended(match.id);
      setVehicleTouched(true);
    }
  }

  function swap() {
    setStops((all) => ({ a: all.b, b: all.a }));
  }

  function findMyLocation() {
    setLocating(true);
    setLocateErr(null);
    setLocateFail(null);
    getMyLocation()
      .then((point) => locate("a", point))
      .catch((why: LocateFailure) => {
        setLocateErr(locateMessage(why));
        setLocateFail(why);
        setLocateHelpOpen(true); // straight to the fix steps, not just a line of text
      })
      .finally(() => setLocating(false));
  }

  /** Fill a stop from a saved address, pin included, so the distance stays right. */
  function applySaved(stop: Stop, address: SavedAddr) {
    const point = address.lat != null && address.lng != null ? { lat: address.lat, lng: address.lng } : null;
    updateStop(stop, { address: address.address, point, ...parseDetails(address.details) });
  }

  async function saveAddress(stop: Stop) {
    const { address, point } = stops[stop];
    if (!address.trim()) return;
    const suggested = stop === "a" ? "المخزن" : "";
    const label = window.prompt("اسم العنوان (مثلاً: المخزن، الفرع، البيت)", suggested)?.trim();
    if (!label) return;
    const details = composeDetails(stops[stop]) || null;
    const lat = point?.lat ?? null;
    const lng = point?.lng ?? null;
    try {
      const r = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, address: address.trim(), details, lat, lng }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.id) throw new Error(`addresses ${r.status}`);
      setSaved((list) => [...list, { id: j.id, label, address: address.trim(), details, lat, lng }]);
      setSavedMsg({ stop, text: `اتحفظ «${label}»` });
    } catch {
      setSavedMsg({ stop, text: "مقدرناش نحفظه دلوقتي" });
    }
    setTimeout(() => setSavedMsg(null), 2500);
  }

  /** Sends the order. Logged out → the sign-in step opens; after signing in it calls this again. */
  async function placeOrder(afterSignIn = false) {
    if (!sizeId) return;
    if (!placesDone) {
      setAddrError(true); // the message shows right under the places
      goTo("sec-places");
      return;
    }
    if (!loggedIn && !afterSignIn) {
      setAuthOpen(true);
      return;
    }
    setOrdering(true);
    setOrderErr(null);
    try {
      const { a, b } = stops;
      const r = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: sizeId,
          km,
          loaders,
          promoCode: appliedPromo || null,
          pickupAddress: a.address.trim(),
          dropoffAddress: b.address.trim(),
          pickupDetails: composeDetails(a) || null,
          dropoffDetails: composeDetails(b) || null,
          cargoType: options.cargo.find((h) => h.size === hint)?.label ?? null,
          notes: notes || null,
          pickupLat: a.point?.lat ?? null,
          pickupLng: a.point?.lng ?? null,
          dropoffLat: b.point?.lat ?? null,
          dropoffLng: b.point?.lng ?? null,
          date,
          time,
        }),
      });
      if (r.status === 401) {
        // the session expired since the page loaded
        setLoggedIn(false);
        setAuthOpen(true);
        return;
      }
      const j = await r.json();
      if (j.code) {
        setOrderCode(j.code);
        return;
      }
      const known = ORDER_ERROR[j.error as string];
      setOrderErr(known?.text ?? GENERIC_ERROR);
      if (known?.toTime) goTo("sec-time");
    } catch {
      setOrderErr(GENERIC_ERROR);
    } finally {
      setOrdering(false);
    }
  }

  function signedIn() {
    setAuthOpen(false);
    setLoggedIn(true);
    router.refresh(); // header, account and company pricing follow the new session
    void placeOrder(true);
  }

  if (orderCode) return <OrderPlaced code={orderCode} />;

  const stopProps = (stop: Stop) => ({
    stop,
    value: stops[stop],
    apiKey: maps?.apiKey ?? "",
    plain,
    near: center,
    resolving: resolving[stop],
    missing: addrError && !stopReady(stops[stop]),
    onFocus: () => setActiveStop(stop),
    onPick: (point: LatLng, address: string) => locate(stop, point, address),
    onChange: (patch: Partial<StopState>) => updateStop(stop, patch),
  });

  const savedChips = (stop: Stop) =>
    account?.loggedIn ? (
      <SavedAddressChips
        saved={saved}
        value={stops[stop].address}
        message={savedMsg?.stop === stop ? savedMsg.text : null}
        onPick={(address) => applySaved(stop, address)}
        onSave={() => saveAddress(stop)}
      />
    ) : null;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-6 lg:items-start">
      <div className="flex flex-col gap-4">
        {account?.company && <CompanyBanner company={account.company} />}
        <Stepper done={[placesDone, timeTouched, vehicleTouched, false]} onGo={goTo} />

        <PlacesCard>
          <StopFields
            {...stopProps("a")}
            action={<LocateButton locating={locating} onClick={findMyLocation} />}
          >
            {savedChips("a")}
            {locateErr && (
              <div
                className="flex flex-wrap items-center gap-2 text-sm font-semibold text-booked"
                role="alert"
              >
                <span>{locateErr}</span>
                <button
                  type="button"
                  onClick={() => setLocateHelpOpen(true)}
                  className="text-primary underline underline-offset-2 cursor-pointer"
                >
                  إزاي أحلها؟
                </button>
              </div>
            )}
          </StopFields>

          <SwapDivider onSwap={swap} />

          <StopFields
            {...stopProps("b")}
            action={plain ? null : <MapToggleButton open={mapOpen} onClick={() => setMapOpen((o) => !o)} />}
          >
            {savedChips("b")}
            {addrError && !placesDone && (
              <p className="text-sm font-semibold text-booked" role="alert">
                {plain
                  ? "اكتب عنوان الاستلام والتسليم عشان السواق يوصل للمكان بالظبط."
                  : "حدد مكان الاستلام والتسليم من البحث أو على الخريطة عشان نحسب المسافة والسواق يوصل بالظبط."}
              </p>
            )}
          </StopFields>

          {maps && (
            <MapPanel
              open={mapOpen}
              error={mapError}
              active={activeStop}
              onActive={setActiveStop}
              container={mapEl}
            />
          )}
          {(plain || (stops.a.point && stops.b.point)) && <DistanceBar km={km} onChange={setKm} />}
        </PlacesCard>

        <ScheduleSection
          date={date}
          time={time}
          minDate={firstDay}
          maxDate={addDaysISO(today, options.advanceDays)}
          slots={availableSlots}
          onDate={(day) => {
            setDate(day);
            setTimeTouched(true);
          }}
          onTime={(slot) => {
            setTime(slot);
            setTimeTouched(true);
          }}
        />

        <CargoHints hints={options.cargo} selected={hint} onPick={pickHint} />

        <VehiclePicker
          sizes={sizes}
          selectedId={sizeId}
          recommendedId={recommended}
          onSelect={(id) => {
            setSizeId(id);
            setVehicleTouched(true);
          }}
        />

        <ExtrasSection
          loaders={loaders}
          maxLoaders={options.maxLoaders}
          loaderFee={loaderFee}
          onLoaders={setLoaders}
          showPromo={!account?.company}
          initialPromo={appliedPromo}
          promoMessage={promoMsg}
          onApplyPromo={(code) => {
            setPromoMsg(null);
            setAppliedPromo(code);
          }}
          notes={notes}
          onNotes={setNotes}
          disclaimer={options.disclaimer}
        />

        {/* spacer so the sticky bar never hides content */}
        <div className="h-24 lg:hidden" aria-hidden />
      </div>

      {/* desktop: summary beside the form, following the scroll */}
      <aside className="lg:sticky lg:top-24">
        <OrderBar
          quote={quote}
          pricing={pricing}
          ordering={ordering}
          error={orderErr}
          hidden={typing}
          onOrder={() => void placeOrder()}
        />
      </aside>

      <LocationHelp
        failure={locateFail}
        open={locateHelpOpen}
        onClose={() => setLocateHelpOpen(false)}
        onRetry={() => {
          setLocateHelpOpen(false);
          findMyLocation();
        }}
        onLocated={(point) => {
          setLocateHelpOpen(false);
          setLocateErr(null);
          setLocateFail(null);
          locate("a", point);
        }}
        onPickOnMap={
          plain
            ? null
            : () => {
                setLocateHelpOpen(false);
                setActiveStop("a");
                setMapOpen(true);
              }
        }
      />
      <AuthGate
        open={authOpen}
        total={quote?.total ?? null}
        onClose={() => setAuthOpen(false)}
        onAuthenticated={signedIn}
      />
    </div>
  );
}

function takeDraft(): Partial<OrderDraft> | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    sessionStorage.removeItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Partial<OrderDraft>) : null;
  } catch {
    return null;
  }
}
