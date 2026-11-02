"use client";
/**
 * Customer A→B order form: places → time → vehicle → details, with a live server price.
 * This component owns the order state; each section is a focused child component.
 */
import { useEffect, useRef, useState } from "react";
import { cairoDateISO } from "@/lib/client-time";
import { useTyping } from "@/hooks/useTyping";
import type { Quote } from "@/engines/pricing";
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
}: DeliveryEstimatorProps) {
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
  const [pickup, setPickup] = useState<LatLng>({ lat: center.lat + 0.008, lng: center.lng - 0.008 });
  const [dropoff, setDropoff] = useState<LatLng>({ lat: center.lat - 0.008, lng: center.lng + 0.008 });
  const [pickupAddr, setPickupAddr] = useState("");
  const [dropoffAddr, setDropoffAddr] = useState("");
  const [pickupDetails, setPickupDetails] = useState("");
  const [dropoffDetails, setDropoffDetails] = useState("");
  const [km, setKm] = useState(() => roadKm(pickup, dropoff));
  const [locating, setLocating] = useState(false);
  const [addrError, setAddrError] = useState(false);
  const [saved, setSaved] = useState<SavedAddr[]>(account?.saved ?? []);
  const [savedMsg, setSavedMsg] = useState<{ stop: Stop; text: string } | null>(null);

  // ---- map ----
  const mapEl = useRef<HTMLDivElement>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [activeStop, setActiveStop] = useState<Stop>("a");
  const setStopPoint = (stop: Stop, point: LatLng) => (stop === "a" ? setPickup(point) : setDropoff(point));
  const map = useDeliveryMap({
    open: mapOpen,
    container: mapEl,
    center,
    pickup,
    dropoff,
    active: activeStop,
    onMove: (stop, point) => setStopPoint(stop, { lat: point.lat, lng: point.lng }),
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
  /** bumped when a draft restores a coupon, so the coupon field shows it */
  const [promoFieldKey, setPromoFieldKey] = useState(0);
  const [promoMsg, setPromoMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [pricing, setPricing] = useState(false);

  // ---- ordering ----
  const [ordering, setOrdering] = useState(false);
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [orderErr, setOrderErr] = useState<string | null>(null);

  // Changing the day can make the chosen time unavailable → jump to the first free one.
  useEffect(() => {
    if (availableSlots.length && !availableSlots.includes(time)) setTime(availableSlots[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the day changes
  }, [date]);

  // Once both addresses are filled, drop the "missing address" warning.
  useEffect(() => {
    if (addrError && pickupAddr.trim() && dropoffAddr.trim()) {
      setAddrError(false);
      setOrderErr(null);
    }
  }, [addrError, pickupAddr, dropoffAddr]);

  useEffect(() => {
    setKm(roadKm(pickup, dropoff));
  }, [pickup, dropoff]);

  // Keep the order through the login detour: ordering while logged out goes to /login and back;
  // the draft lives in sessionStorage (this tab only).
  useEffect(() => {
    const draft = takeDraft();
    if (!draft) return;
    if (draft.pickup) setPickup(draft.pickup);
    if (draft.dropoff) setDropoff(draft.dropoff);
    setPickupAddr(draft.pickupAddr ?? "");
    setDropoffAddr(draft.dropoffAddr ?? "");
    setPickupDetails(draft.pickupDetails ?? "");
    setDropoffDetails(draft.dropoffDetails ?? "");
    setNotes(draft.notes ?? "");
    const draftSize = sizes.find((s) => s.id === draft.sizeId);
    if (draftSize) {
      setSizeId(draftSize.id);
      setVehicleTouched(true);
    }
    if (draft.hint) setHint(draft.hint);
    if (draft.date && draft.date >= today) setDate(draft.date);
    if (draft.time && slotsFor(draft.date ?? today).includes(draft.time)) setTime(draft.time);
    setTimeTouched(true);
    setLoaders(Math.min(options.maxLoaders, Number(draft.loaders) || 0));
    if (draft.promo) {
      setAppliedPromo(draft.promo);
      setPromoFieldKey((k) => k + 1);
    }
    // distance is recomputed from the restored pins
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);

  // Live price: re-quote on the server whenever an input changes (debounced).
  useEffect(() => {
    if (!sizeId) return;
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
  }, [sizeId, km, loaders, appliedPromo]);

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
    setPickup(dropoff);
    setDropoff(pickup);
    setPickupAddr(dropoffAddr);
    setDropoffAddr(pickupAddr);
    setPickupDetails(dropoffDetails);
    setDropoffDetails(pickupDetails);
    map.setPin("a", dropoff);
    map.setPin("b", pickup);
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPickup(here);
        map.setPin("a", here);
        map.focus(here);
        if (!pickupAddr.trim()) setPickupAddr("موقعي الحالي");
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  /** Fill a stop from a saved address — also moves the pin so the distance stays right. */
  function applySaved(stop: Stop, address: SavedAddr) {
    if (stop === "a") {
      setPickupAddr(address.address);
      setPickupDetails(address.details ?? "");
    } else {
      setDropoffAddr(address.address);
      setDropoffDetails(address.details ?? "");
    }
    if (address.lat != null && address.lng != null) {
      const point = { lat: address.lat, lng: address.lng };
      setStopPoint(stop, point);
      map.setPin(stop, point);
    }
  }

  async function saveAddress(stop: Stop) {
    const address = (stop === "a" ? pickupAddr : dropoffAddr).trim();
    if (!address) return;
    const suggested = stop === "a" ? "المخزن" : "";
    const label = window.prompt("اسم العنوان (مثلاً: المخزن، الفرع، البيت)", suggested)?.trim();
    if (!label) return;
    const point = stop === "a" ? pickup : dropoff;
    const details = (stop === "a" ? pickupDetails : dropoffDetails).trim() || null;
    try {
      const r = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, address, details, lat: point.lat, lng: point.lng }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.id) throw new Error(`addresses ${r.status}`);
      setSaved((list) => [...list, { id: j.id, label, address, details, lat: point.lat, lng: point.lng }]);
      setSavedMsg({ stop, text: `اتحفظ «${label}»` });
    } catch {
      setSavedMsg({ stop, text: "مقدرناش نحفظه دلوقتي" });
    }
    setTimeout(() => setSavedMsg(null), 2500);
  }

  async function placeOrder() {
    if (!sizeId) return;
    if (!pickupAddr.trim() || !dropoffAddr.trim()) {
      setAddrError(true); // the message shows right under the address fields
      goTo("sec-places");
      return;
    }
    setOrdering(true);
    setOrderErr(null);
    try {
      const r = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: sizeId,
          km,
          loaders,
          promoCode: appliedPromo || null,
          pickupAddress: pickupAddr || null,
          dropoffAddress: dropoffAddr || null,
          pickupDetails: pickupDetails || null,
          dropoffDetails: dropoffDetails || null,
          cargoType: options.cargo.find((h) => h.size === hint)?.label ?? null,
          notes: notes || null,
          pickupLat: pickup.lat,
          pickupLng: pickup.lng,
          dropoffLat: dropoff.lat,
          dropoffLng: dropoff.lng,
          date,
          time,
        }),
      });
      if (r.status === 401) {
        keepDraft({
          pickup,
          dropoff,
          pickupAddr,
          dropoffAddr,
          pickupDetails,
          dropoffDetails,
          notes,
          sizeId,
          hint,
          date,
          time,
          loaders,
          promo: appliedPromo,
        });
        window.location.href = "/login?next=/estimate";
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

  if (orderCode) return <OrderPlaced code={orderCode} />;

  const placesDone = Boolean(pickupAddr.trim() && dropoffAddr.trim());
  const missingPickup = addrError && !pickupAddr.trim();
  const missingDropoff = addrError && !dropoffAddr.trim();

  const savedChips = (stop: Stop) =>
    account?.loggedIn ? (
      <SavedAddressChips
        saved={saved}
        value={stop === "a" ? pickupAddr : dropoffAddr}
        message={savedMsg?.stop === stop ? savedMsg.text : null}
        onPick={(address) => applySaved(stop, address)}
        onSave={() => saveAddress(stop)}
      />
    ) : null;

  return (
    <div className="flex flex-col gap-4">
      {account?.company && <CompanyBanner company={account.company} />}
      <Stepper done={[placesDone, timeTouched, vehicleTouched, false]} onGo={goTo} />

      <PlacesCard>
        <StopFields
          stop="a"
          address={pickupAddr}
          details={pickupDetails}
          onAddress={setPickupAddr}
          onDetails={setPickupDetails}
          onFocus={() => setActiveStop("a")}
          missing={missingPickup}
          action={<LocateButton locating={locating} onClick={useMyLocation} />}
        >
          {savedChips("a")}
        </StopFields>

        <SwapDivider onSwap={swap} />

        <StopFields
          stop="b"
          address={dropoffAddr}
          details={dropoffDetails}
          onAddress={setDropoffAddr}
          onDetails={setDropoffDetails}
          onFocus={() => setActiveStop("b")}
          missing={missingDropoff}
          action={<MapToggleButton open={mapOpen} onClick={() => setMapOpen((o) => !o)} />}
        >
          {savedChips("b")}
          {addrError && !placesDone && (
            <p className="text-sm font-bold text-booked">
              اكتب عنوان الاستلام والتسليم عشان السواق يوصل للمكان بالظبط.
            </p>
          )}
        </StopFields>

        <MapPanel
          open={mapOpen}
          error={mapError}
          active={activeStop}
          onActive={setActiveStop}
          container={mapEl}
        />
        <DistanceBar km={km} onChange={setKm} />
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
        key={promoFieldKey}
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
      <div className="h-24" aria-hidden />

      <OrderBar
        quote={quote}
        pricing={pricing}
        ordering={ordering}
        error={orderErr}
        hidden={typing}
        onOrder={placeOrder}
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

function keepDraft(draft: OrderDraft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // private mode / storage full: the customer re-enters the order after login
  }
}
