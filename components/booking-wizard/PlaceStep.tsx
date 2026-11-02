"use client";
import { Button, inputClass } from "@/components/ui";
import { BigChoice, StepCard, type DeliveryAddress, type Place } from "./parts";

const MAX_LOADERS = 6;

type PlaceStepProps = {
  place: Place;
  onPlace: (place: Place) => void;
  address: DeliveryAddress;
  onAddress: (address: DeliveryAddress) => void;
  /** the "with driver" choice is offered for available vehicles only */
  canChooseDriver: boolean;
  withDriver: boolean;
  onWithDriver: (withDriver: boolean) => void;
  loaders: number;
  onLoaders: (n: number) => void;
  onNext: () => void;
  onBack: () => void;
};

/** Pickup at the branch or delivery, the driver option and loaders. */
export function PlaceStep(props: PlaceStepProps) {
  return (
    <StepCard title="هتستلم العربية منين؟" onBack={props.onBack}>
      <div className="grid grid-cols-2 gap-3">
        <BigChoice
          label="من الفرع"
          active={props.place === "branch"}
          onClick={() => props.onPlace("branch")}
          icon="🏢"
        />
        <BigChoice
          label="توصيل لعندي"
          active={props.place === "delivery"}
          onClick={() => props.onPlace("delivery")}
          icon="📍"
        />
      </div>

      {props.place === "delivery" && (
        <DeliveryAddressFields value={props.address} onChange={props.onAddress} />
      )}

      {props.canChooseDriver && (
        <div className="mt-5">
          <span className="block mb-2 font-bold">عايز العربية بس ولا مع سائق؟</span>
          <div className="grid grid-cols-2 gap-3">
            <BigChoice
              label="العربية فقط"
              active={!props.withDriver}
              onClick={() => props.onWithDriver(false)}
            />
            <BigChoice
              label="العربية + سائق"
              active={props.withDriver}
              onClick={() => props.onWithDriver(true)}
            />
          </div>
        </div>
      )}

      <LoadersStepper value={props.loaders} onChange={props.onLoaders} />

      <Button full className="mt-5" onClick={props.onNext}>
        راجع الحجز
      </Button>
    </StepCard>
  );
}

function DeliveryAddressFields({
  value,
  onChange,
}: {
  value: DeliveryAddress;
  onChange: (a: DeliveryAddress) => void;
}) {
  const field = (key: keyof DeliveryAddress, placeholder: string, wide = false) => (
    <input
      className={wide ? `${inputClass} col-span-2` : inputClass}
      placeholder={placeholder}
      value={value[key]}
      onChange={(e) => onChange({ ...value, [key]: e.target.value })}
    />
  );

  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      {field("area", "المنطقة")}
      {field("street", "الشارع")}
      {field("building", "العمارة")}
      {field("floor", "الدور")}
      {field("landmark", "علامة مميزة (اختياري)", true)}
    </div>
  );
}

/** Loaders / عمالة add-on for loading and unloading. */
function LoadersStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const caption = value === 0 ? "من غير عمالة" : value === 1 ? "فرد واحد" : "أفراد";

  return (
    <div className="mt-5">
      <span className="block mb-2 font-bold">محتاج عمالة للتحميل والتنزيل؟</span>
      <div className="flex items-center justify-between bg-panel border-2 border-line-2 rounded-2xl p-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="tap w-12 h-12 rounded-xl bg-panel-2 text-2xl font-extrabold disabled:opacity-40"
          disabled={value === 0}
          aria-label="أقل"
        >
          −
        </button>
        <div className="text-center">
          <div className="text-2xl font-extrabold">{value === 0 ? "بدون" : value}</div>
          <div className="text-xs text-muted">{caption}</div>
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.min(MAX_LOADERS, value + 1))}
          className="tap w-12 h-12 rounded-xl bg-primary text-white text-2xl font-extrabold disabled:opacity-40"
          disabled={value === MAX_LOADERS}
          aria-label="أكتر"
        >
          +
        </button>
      </div>
    </div>
  );
}
