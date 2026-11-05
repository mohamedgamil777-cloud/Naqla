"use client";
import { useMemo, useState } from "react";
import { PriceBreakdown } from "@/components/ui";
import {
  computeTripPrice,
  DEFAULT_TRIP_RATES,
  type LoadSize,
  type TripRates,
  type TripVehicleRates,
} from "@/engines/trip-pricing";

const inp =
  "w-full rounded-xl border border-line-2 bg-panel px-3 py-2.5 text-base outline-none focus:border-primary";
const lbl = "block text-sm font-bold text-ink-2 mb-1.5";
const card = "bg-panel border border-line rounded-card p-5 flex flex-col gap-4";

function Num({
  label,
  value,
  onChange,
  min = 0,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label>
      <span className={lbl}>{label}</span>
      <input
        className={inp}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
      />
    </label>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 font-semibold">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5"
      />
      {label}
    </label>
  );
}

export function TripCalculator() {
  const [vehicles, setVehicles] = useState<TripVehicleRates[]>(DEFAULT_TRIP_RATES.vehicles);
  const rates: TripRates = useMemo(() => ({ ...DEFAULT_TRIP_RATES, vehicles }), [vehicles]);

  const [vehicleId, setVehicleId] = useState("van-s");
  const [km, setKm] = useState(10);
  const [driveMinutes, setDriveMinutes] = useState(30);
  const [load, setLoad] = useState<LoadSize>("room");
  const [helpers, setHelpers] = useState(2);
  const [pickupFloor, setPickupFloor] = useState(0);
  const [pickupElevator, setPickupElevator] = useState(false);
  const [dropFloor, setDropFloor] = useState(0);
  const [dropElevator, setDropElevator] = useState(false);
  const [heavyItems, setHeavyItems] = useState(0);
  const [assemblyBoth, setAssemblyBoth] = useState(0);
  const [assemblyOne, setAssemblyOne] = useState(0);
  const [extraStops, setExtraStops] = useState(0);
  const [waitMinutes, setWaitMinutes] = useState(0);
  const [longCarry, setLongCarry] = useState(false);
  const [boxes, setBoxes] = useState(0);
  const [wrapRolls, setWrapRolls] = useState(0);
  const [declaredValue, setDeclaredValue] = useState(0);
  const [surgeId, setSurgeId] = useState("normal");
  const [discountPct, setDiscountPct] = useState(0);
  const [withVat, setWithVat] = useState(false);

  const vehicle = vehicles.find((v) => v.id === vehicleId) ?? vehicles[0];

  const result = useMemo(() => {
    try {
      return computeTripPrice(
        {
          vehicleId,
          km,
          driveMinutes,
          load,
          helpers,
          pickup: { floor: pickupFloor, elevator: pickupElevator },
          dropoff: { floor: dropFloor, elevator: dropElevator },
          heavyItems,
          assemblyBoth,
          assemblyOne,
          extraStops,
          waitMinutes,
          longCarry,
          boxes,
          wrapRolls,
          declaredValue,
          surgeId,
          discountPct,
          withVat,
        },
        rates,
      );
    } catch {
      return null;
    }
  }, [
    rates,
    vehicleId,
    km,
    driveMinutes,
    load,
    helpers,
    pickupFloor,
    pickupElevator,
    dropFloor,
    dropElevator,
    heavyItems,
    assemblyBoth,
    assemblyOne,
    extraStops,
    waitMinutes,
    longCarry,
    boxes,
    wrapRolls,
    declaredValue,
    surgeId,
    discountPct,
    withVat,
  ]);

  const pickLoad = (l: LoadSize) => {
    setLoad(l);
    setHelpers(Math.min(DEFAULT_TRIP_RATES.loads[l].suggestedHelpers, vehicle.maxHelpers));
  };

  const setRate = (id: string, key: "baseFare" | "perKm" | "per30Min", value: number) =>
    setVehicles((vs) => vs.map((v) => (v.id === id ? { ...v, [key]: value } : v)));

  const hours = result ? Math.floor(result.jobMinutes / 60) : 0;
  const mins = result ? result.jobMinutes % 60 : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="flex flex-col gap-5">
        <section className={card}>
          <h2 className="font-extrabold text-lg">العربية والمشوار</h2>
          <label>
            <span className={lbl}>نوع العربية</span>
            <select
              className={inp}
              value={vehicleId}
              onChange={(e) => {
                setVehicleId(e.target.value);
                const v = vehicles.find((x) => x.id === e.target.value);
                if (v) setHelpers((h) => Math.min(h, v.maxHelpers));
              }}
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nameAr} — يبدأ من {v.baseFare} ج
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <Num label="المسافة (كيلومتر)" value={km} onChange={setKm} />
            <Num label="وقت السواقة (دقيقة)" value={driveMinutes} onChange={setDriveMinutes} />
          </div>
          <label>
            <span className={lbl}>حجم الحمولة</span>
            <select className={inp} value={load} onChange={(e) => pickLoad(e.target.value as LoadSize)}>
              {(Object.keys(DEFAULT_TRIP_RATES.loads) as LoadSize[]).map((k) => (
                <option key={k} value={k}>
                  {DEFAULT_TRIP_RATES.loads[k].labelAr}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={lbl}>وقت الحجز (سعر الذروة)</span>
            <select className={inp} value={surgeId} onChange={(e) => setSurgeId(e.target.value)}>
              {DEFAULT_TRIP_RATES.surges.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.labelAr} — ×{s.multiplier}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className={card}>
          <h2 className="font-extrabold text-lg">العمالة والأدوار</h2>
          <Num
            label={`عدد العمال (أقصى عدد للعربية دي ${vehicle.maxHelpers})`}
            value={helpers}
            max={vehicle.maxHelpers}
            onChange={(v) => setHelpers(Math.min(v, vehicle.maxHelpers))}
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Num label="دور التحميل" value={pickupFloor} onChange={setPickupFloor} />
              <Check label="فيه أسانسير الحاجة تدخله" checked={pickupElevator} onChange={setPickupElevator} />
            </div>
            <div className="flex flex-col gap-2">
              <Num label="دور التنزيل" value={dropFloor} onChange={setDropFloor} />
              <Check label="فيه أسانسير الحاجة تدخله" checked={dropElevator} onChange={setDropElevator} />
            </div>
          </div>
          <Num label="قطع تقيلة (تلاجة كبيرة، بيانو، خزنة…)" value={heavyItems} onChange={setHeavyItems} />
        </section>

        <section className={card}>
          <h2 className="font-extrabold text-lg">الإضافات</h2>
          <div className="grid grid-cols-2 gap-4">
            <Num label="فك وتركيب (قطعة)" value={assemblyBoth} onChange={setAssemblyBoth} />
            <Num label="فك بس أو تركيب بس (قطعة)" value={assemblyOne} onChange={setAssemblyOne} />
            <Num label="محطات إضافية" value={extraStops} onChange={setExtraStops} />
            <Num label="انتظار متوقع (دقيقة)" value={waitMinutes} onChange={setWaitMinutes} />
            <Num label="كراتين" value={boxes} onChange={setBoxes} />
            <Num label="استرتش (رول)" value={wrapRolls} onChange={setWrapRolls} />
            <Num label="قيمة البضاعة للتأمين (ج)" value={declaredValue} onChange={setDeclaredValue} />
            <Num
              label="خصم %"
              value={discountPct}
              max={100}
              onChange={(v) => setDiscountPct(Math.min(100, v))}
            />
          </div>
          <div className="flex flex-wrap gap-5">
            <Check label="شيل لمسافة طويلة (أكتر من 30 متر)" checked={longCarry} onChange={setLongCarry} />
            <Check label="ضريبة القيمة المضافة 14%" checked={withVat} onChange={setWithVat} />
          </div>
        </section>

        <details className={card}>
          <summary className="font-extrabold text-lg cursor-pointer">أسعار العربيات (للتجربة)</summary>
          <p className="text-sm text-muted">
            غيّر الأرقام هنا عشان تجرب أسعار مختلفة. التغيير ده للحاسبة بس ومش بيتحفظ.
          </p>
          {vehicles.map((v) => (
            <div key={v.id} className="flex flex-col gap-2">
              <span className="font-bold">{v.nameAr}</span>
              <div className="grid grid-cols-3 gap-3">
                <Num label="بداية (ج)" value={v.baseFare} onChange={(x) => setRate(v.id, "baseFare", x)} />
                <Num label="الكيلو (ج)" value={v.perKm} onChange={(x) => setRate(v.id, "perKm", x)} />
                <Num label="نص ساعة (ج)" value={v.per30Min} onChange={(x) => setRate(v.id, "per30Min", x)} />
              </div>
            </div>
          ))}
          <button
            type="button"
            className="self-start rounded-xl border border-line-2 px-4 py-2 font-semibold"
            onClick={() => setVehicles(DEFAULT_TRIP_RATES.vehicles)}
          >
            رجّع الأسعار الأصلية
          </button>
        </details>
      </div>

      <div className="flex flex-col gap-3 lg:sticky lg:top-4 self-start w-full">
        {result ? (
          <>
            <PriceBreakdown quote={result.quote} />
            <p className="text-sm text-muted">
              وقت الشغلانة المتوقع: {hours} ساعة و{mins} دقيقة (تحميل + سواقة + تنزيل + 10% احتياطي). السعر ده
              ثابت للعميل، ويتغير بس لو العميل غيّر الشغلانة.
            </p>
          </>
        ) : (
          <div className="bg-panel border border-line rounded-card p-8 text-center text-muted">
            اكتب البيانات يظهرلك السعر.
          </div>
        )}
      </div>
    </div>
  );
}
