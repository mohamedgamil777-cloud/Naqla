"use client";
/**
 * Rental booking, one question per screen: vehicle → day → time → duration → place → review.
 * This component owns the booking state and server calls; each step is a focused child.
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { VehicleKind } from "@/lib/constants";
import type { VehicleListItem } from "@/types";
import type { Quote } from "@/engines/pricing";
import { authErrorText } from "@/lib/auth-messages";
import { cairoDateISO } from "@/lib/client-time";
import {
  ChosenSummary,
  STEP_ORDER,
  Stepper,
  type Alt,
  type DeliveryAddress,
  type Place,
  type SlotDTO,
  type Step,
} from "./parts";
import { DurationStep, KindStep, TimeStep, VehicleStep, WhenStep } from "./PickSteps";
import { PlaceStep } from "./PlaceStep";
import { ReviewStep } from "./ReviewStep";

type BookingWizardProps = {
  vehicles: VehicleListItem[];
  initialKind?: VehicleKind;
  initialVehicleId?: string;
  isAuthed: boolean;
  initialName?: string;
};

const EMPTY_ADDRESS: DeliveryAddress = {
  area: "",
  street: "",
  building: "",
  floor: "",
  apt: "",
  landmark: "",
};

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return (await r.json()) as T;
}

async function fetchDurations(vehicleId: string, startISO: string): Promise<number[]> {
  const j = await getJson<{ durations?: number[] }>(
    `/api/availability/durations?vehicle=${vehicleId}&start=${encodeURIComponent(startISO)}`,
  );
  return j.durations ?? [];
}

export function BookingWizard({
  vehicles,
  initialKind,
  initialVehicleId,
  isAuthed,
  initialName = "",
}: BookingWizardProps) {
  const router = useRouter();
  const initialVehicle = vehicles.find((v) => v.id === initialVehicleId);
  // The first reachable step depends on how the customer entered the wizard.
  const entryStep: Step = initialVehicle ? "when" : initialKind ? "vehicle" : "kind";

  const [step, setStep] = useState<Step>(entryStep);
  const [kind, setKind] = useState<VehicleKind | undefined>(initialVehicle?.kind ?? initialKind);
  const [vehicleId, setVehicleId] = useState<string | undefined>(initialVehicleId);
  const [dateISO, setDateISO] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotDTO[] | null>(null);
  const [startISO, setStartISO] = useState<string | null>(null);
  const [startHour, setStartHour] = useState<number | null>(null);
  const [durations, setDurations] = useState<number[] | null>(null);
  const [hours, setHours] = useState<number | null>(null);
  const [place, setPlace] = useState<Place>("branch");
  const [withDriver, setWithDriver] = useState(false);
  const [loaders, setLoaders] = useState(0);
  const [address, setAddress] = useState<DeliveryAddress>(EMPTY_ADDRESS);
  const [promo, setPromo] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [alts, setAlts] = useState<Alt[] | null>(null);

  // auth (inline at review)
  const [authed, setAuthed] = useState(isAuthed);
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const selected = useMemo(() => vehicles.find((v) => v.id === vehicleId), [vehicles, vehicleId]);
  const filtered = useMemo(() => vehicles.filter((v) => (kind ? v.kind === kind : true)), [vehicles, kind]);

  function goBack() {
    setErr(null);
    setAlts(null);
    const i = STEP_ORDER.indexOf(step);
    if (step === entryStep || i <= 0) router.push("/");
    else setStep(STEP_ORDER[i - 1]);
  }

  async function chooseDay(date: string, forVehicle = vehicleId) {
    setDateISO(date);
    setStartISO(null);
    setDurations(null);
    setHours(null);
    setStep("time");
    if (!forVehicle) return;
    setLoading(true);
    setErr(null);
    try {
      const j = await getJson<{ slots?: SlotDTO[] }>(`/api/availability?vehicle=${forVehicle}&date=${date}`);
      setSlots(j.slots ?? []);
    } catch {
      setErr("مشكلة في تحميل المواعيد، حاول تاني.");
    } finally {
      setLoading(false);
    }
  }

  function chooseVehicle(v: VehicleListItem) {
    setVehicleId(v.id);
    setKind(v.kind);
    void chooseDay(cairoDateISO(0), v.id);
  }

  async function chooseSlot(s: SlotDTO) {
    if (!vehicleId) return;
    setStartISO(s.startISO);
    setStartHour(s.hour24);
    setLoading(true);
    setErr(null);
    try {
      const ds = await fetchDurations(vehicleId, s.startISO);
      setDurations(ds);
      if (ds.length === 0) setErr("مفيش مدة متاحة تبدأ من الوقت ده، اختار وقت تاني.");
      else setStep("duration");
    } catch {
      setErr("مشكلة في تحميل المدد، حاول تاني.");
    } finally {
      setLoading(false);
    }
  }

  async function loadQuote() {
    if (!vehicleId || !startISO || !hours) return;
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId,
          startISO,
          hours,
          withDriver,
          withDelivery: place === "delivery",
          loaders,
          promoCode: promo || null,
        }),
      });
      const j = await r.json();
      if (j.error === "INVALID_PROMO") {
        setErr("كود الخصم مش صحيح أو مش متاح.");
        setPromo(""); // the next quote is without the coupon
      } else if (j.quote) {
        setQuote(j.quote);
      } else {
        throw new Error(`quote ${r.status}`);
      }
    } catch {
      setErr("مشكلة في حساب السعر، حاول تاني.");
    } finally {
      setLoading(false);
    }
  }

  async function goReview() {
    setStep("review");
    await loadQuote();
  }

  async function signIn() {
    setErr(null);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) {
        setAuthed(true);
        if (!name.trim() && j.name) setName(j.name);
      } else {
        setErr(authErrorText(j));
      }
    } catch {
      setErr("مشكلة في الاتصال، حاول تاني.");
    }
  }

  async function submit() {
    if (!vehicleId || !startISO || !hours || !name.trim()) {
      setErr("اكتب اسمك الأول.");
      return;
    }
    setLoading(true);
    setErr(null);
    setAlts(null);
    try {
      const r = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId,
          startISO,
          hours,
          withDriver,
          withDelivery: place === "delivery",
          loaders,
          deliveryAddress: place === "delivery" ? address : null,
          promoCode: promo || null,
          contactName: name,
        }),
      });
      const j = await r.json();
      if (r.ok && j.code) {
        router.push(`/confirm/${j.code}`);
      } else if (r.status === 409) {
        setErr("العربية دي مش متاحة في الوقت ده. جرب ميعاد تاني");
        setAlts(j.alternatives ?? []);
      } else if (r.status === 401) {
        setAuthed(false);
        setErr("محتاج تأكيد رقم موبايلك الأول.");
      } else {
        setErr("مشكلة في الحجز، حاول تاني.");
      }
    } catch {
      setErr("مشكلة في الاتصال، حاول تاني.");
    } finally {
      setLoading(false);
    }
  }

  /** Jump back to the duration step from a suggested alternative start. */
  async function pickAlt(a: Alt) {
    if (!vehicleId) return;
    setStartISO(a.startISO);
    setAlts(null);
    setErr(null);
    setStep("duration");
    try {
      setDurations(await fetchDurations(vehicleId, a.startISO));
    } catch {
      setErr("مشكلة في تحميل المدد، حاول تاني.");
    }
  }

  return (
    <div className="p-4 flex flex-col gap-4 w-full max-w-2xl mx-auto">
      <Stepper step={step} />
      <ChosenSummary vehicle={selected} kind={kind} dateISO={dateISO} startHour={startHour} hours={hours} />

      {err && <div className="bg-booked-soft text-booked rounded-2xl px-4 py-3 font-semibold">{err}</div>}

      {step === "kind" && (
        <KindStep
          onPick={(k) => {
            setKind(k);
            setStep("vehicle");
          }}
          onBack={goBack}
        />
      )}
      {step === "vehicle" && <VehicleStep vehicles={filtered} onPick={chooseVehicle} onBack={goBack} />}
      {step === "when" && <WhenStep onPick={(date) => void chooseDay(date)} onBack={goBack} />}
      {step === "time" && <TimeStep slots={slots} loading={loading} onPick={chooseSlot} onBack={goBack} />}
      {step === "duration" && durations && (
        <DurationStep
          durations={durations}
          onPick={(h) => {
            setHours(h);
            setStep("place");
          }}
          onBack={goBack}
        />
      )}
      {step === "place" && (
        <PlaceStep
          place={place}
          onPlace={setPlace}
          address={address}
          onAddress={setAddress}
          canChooseDriver={selected?.status === "available"}
          withDriver={withDriver}
          onWithDriver={setWithDriver}
          loaders={loaders}
          onLoaders={setLoaders}
          onNext={goReview}
          onBack={goBack}
        />
      )}
      {step === "review" && (
        <ReviewStep
          vehicle={selected}
          dateISO={dateISO}
          startHour={startHour}
          hours={hours}
          place={place}
          withDriver={withDriver}
          loaders={loaders}
          quote={quote}
          loading={loading}
          promo={promo}
          onPromo={setPromo}
          onApplyPromo={loadQuote}
          name={name}
          onName={setName}
          authed={authed}
          signIn={{ phone, password, onPhone: setPhone, onPassword: setPassword, onSubmit: signIn }}
          alternatives={alts}
          onAlternative={pickAlt}
          onConfirm={submit}
          onBack={goBack}
        />
      )}
    </div>
  );
}
