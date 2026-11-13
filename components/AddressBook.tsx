"use client";
/**
 * عناويني المحفوظة (حسابي) / عناوين الشركة (شركتي): add, edit, make default, delete.
 * The default address fills the pickup on the order form by itself; the rest are one tap away there.
 */
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  deleteSavedAddressAction,
  saveSavedAddressAction,
  setDefaultAddressAction,
} from "@/actions/customer/company";
import type { ActionResult } from "@/lib/action-result";
import { getMyLocation, locateMessage, type LocateFailure } from "@/lib/geolocation";
import { loadGoogleMaps, onMapsAuthFailure, reverseGeocode, type LatLng } from "@/lib/google-maps";
import { Icon } from "@/components/Icons";
import { PlaceSearch } from "@/components/delivery-estimator/PlaceSearch";
import { composeDetails, detailField, parseDetails, type SavedAddr } from "@/components/delivery-estimator/model";

type Props = {
  addresses: SavedAddr[];
  /** Google Maps key; null → a plain typed address */
  apiKey: string | null;
  near: LatLng;
  /** label ideas shown as chips */
  labelIdeas: string[];
  emptyText: string;
  /** company employees see the company admin's list without changing it */
  readOnly?: boolean;
};

export function AddressBook({ addresses, apiKey, near, labelIdeas, emptyText, readOnly }: Props) {
  // null = closed, "new" = adding, otherwise the id being edited
  const [editing, setEditing] = useState<string | null>(null);
  const current = addresses.find((a) => a.id === editing) ?? null;

  return (
    <div className="flex flex-col gap-3">
      {addresses.length === 0 && editing !== "new" && <p className="text-muted text-sm">{emptyText}</p>}

      {addresses.length > 0 && (
        <div className="flex flex-col divide-y divide-line">
          {addresses.map((a) =>
            editing === a.id ? (
              <div key={a.id} className="py-3">
                <AddressForm
                  key={a.id}
                  initial={current}
                  apiKey={apiKey}
                  near={near}
                  labelIdeas={labelIdeas}
                  onDone={() => setEditing(null)}
                />
              </div>
            ) : (
              <AddressRow key={a.id} address={a} readOnly={readOnly} onEdit={() => setEditing(a.id)} />
            ),
          )}
        </div>
      )}

      {readOnly ? null : editing === "new" ? (
        <div className="rounded-card border border-line bg-panel-2 p-3">
          <AddressForm
            key="new"
            initial={null}
            apiKey={apiKey}
            near={near}
            labelIdeas={labelIdeas}
            firstOne={addresses.length === 0}
            onDone={() => setEditing(null)}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="self-start rounded-xl border-2 border-dashed border-primary/40 text-primary font-bold px-4 py-2.5 hover:bg-primary-soft"
        >
          <Icon name="plus" className="w-4 h-4 inline-block align-[-3px] me-1.5" />
          أضف عنوان
        </button>
      )}
    </div>
  );
}

function AddressRow({ address: a, readOnly, onEdit }: { address: SavedAddr; readOnly?: boolean; onEdit: () => void }) {
  return (
    <div className="py-2.5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="font-bold flex items-center gap-2 flex-wrap">
          <span>
            <Icon name="mapPin" className="w-4 h-4 inline-block align-[-3px] me-1.5" />
            {a.label}
          </span>
          {a.isDefault && (
            <span className="rounded-full bg-primary-soft text-primary-ink text-xs px-2 py-0.5">الأساسي</span>
          )}
        </div>
        <div className="text-sm text-muted break-words">
          {a.address}
          {a.details ? ` — ${a.details}` : ""}
        </div>
      </div>
      {!readOnly && (
      <div className="flex items-center gap-3 shrink-0 text-sm font-bold">
        {!a.isDefault && (
          <form action={setDefaultAddressAction}>
            <button name="id" value={a.id} className="text-primary" title="يتملي لوحده في صفحة الطلب">
              خليه الأساسي
            </button>
          </form>
        )}
        <button type="button" onClick={onEdit} className="text-ink-2">
          تعديل
        </button>
        <form
          action={deleteSavedAddressAction}
          onSubmit={(e) => {
            if (!window.confirm(`تمسح «${a.label}»؟`)) e.preventDefault();
          }}
        >
          <button name="id" value={a.id} className="text-booked">
            حذف
          </button>
        </form>
      </div>
      )}
    </div>
  );
}

type FormProps = {
  initial: SavedAddr | null;
  apiKey: string | null;
  near: LatLng;
  labelIdeas: string[];
  /** the first address of a list is the default anyway */
  firstOne?: boolean;
  onDone: () => void;
};

function AddressForm({ initial, apiKey, near, labelIdeas, firstOne, onDone }: FormProps) {
  const [state, action] = useActionState<ActionResult, FormData>(saveSavedAddressAction, { ok: false });
  const [label, setLabel] = useState(initial?.label ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [point, setPoint] = useState<LatLng | null>(
    initial?.lat != null && initial?.lng != null ? { lat: initial.lat, lng: initial.lng } : null,
  );
  const [details, setDetails] = useState(() => parseDetails(initial?.details ?? null));
  const [mapsBroken, setMapsBroken] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const plain = !apiKey || mapsBroken;

  useEffect(() => onMapsAuthFailure(() => setMapsBroken(true)), []);
  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  async function locateMe() {
    setLocating(true);
    setLocateError(null);
    try {
      const here = await getMyLocation();
      setPoint(here);
      let found: string | null = null;
      if (!plain && apiKey) {
        try {
          await loadGoogleMaps(apiKey);
          found = await reverseGeocode(here);
        } catch {
          /* keep the pin; the customer can type the street */
        }
      }
      setAddress((typed) => found ?? (typed.trim() ? typed : "موقعي الحالي"));
    } catch (failure) {
      setLocateError(locateMessage(failure as LocateFailure));
    } finally {
      setLocating(false);
    }
  }

  const detailsText = composeDetails(details);

  return (
    <form action={action} className="flex flex-col gap-3">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="address" value={address} />
      <input type="hidden" name="details" value={detailsText} />
      <input type="hidden" name="lat" value={point?.lat ?? ""} />
      <input type="hidden" name="lng" value={point?.lng ?? ""} />

      {state.error && (
        <div className="bg-booked-soft text-booked rounded-xl px-3 py-2 text-sm font-bold" role="alert">
          {state.error}
        </div>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">اسم العنوان</span>
        <input
          name="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
          maxLength={40}
          placeholder="مثلاً: البيت، المخزن، فرع مدينة نصر"
          className={detailField}
        />
        <span className="flex flex-wrap gap-1.5">
          {labelIdeas.map((idea) => (
            <button
              key={idea}
              type="button"
              onClick={() => setLabel(idea)}
              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                label === idea ? "border-primary text-primary bg-primary-soft" : "border-line-2 text-ink-2"
              }`}
            >
              {idea}
            </button>
          ))}
        </span>
      </label>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold">العنوان</span>
          <button
            type="button"
            onClick={() => void locateMe()}
            disabled={locating}
            className="text-sm font-bold text-primary disabled:opacity-50"
          >
            <Icon name="locate" className="w-4 h-4 inline-block align-[-3px] me-1" />
            {locating ? "بندوّر…" : "موقعي الحالي"}
          </button>
        </div>
        <PlaceSearch
          apiKey={apiKey ?? ""}
          plain={plain}
          address={address}
          near={point ?? near}
          label="العنوان"
          missing={!!state.error && !address.trim()}
          onFocus={() => {}}
          onPick={(p, found) => {
            setPoint(p);
            setAddress(found);
          }}
          onType={(typed) => {
            setAddress(typed);
            setPoint(null); // a typed address no longer matches the old pin
          }}
        />
        {!plain && (
          <p className="text-[13px] text-muted">
            {point ? (
              <span className="text-ok font-semibold">
                <Icon name="checkCircle" className="w-4 h-4 inline-block align-[-3px] me-1" />
                تم تحديد المكان: {address}
              </span>
            ) : (
              "اكتب واختار المكان من نتايج البحث، أو دوس «موقعي الحالي»."
            )}
          </p>
        )}
        {locateError && <p className="text-sm text-booked">{locateError}</p>}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ["building", "رقم العمارة"],
            ["floor", "الدور"],
            ["apartment", "الشقة"],
          ] as const
        ).map(([key, text]) => (
          <label key={key}>
            <span className="block text-[13px] text-muted mb-1">{text}</span>
            <input
              value={details[key]}
              onChange={(e) => setDetails((d) => ({ ...d, [key]: e.target.value }))}
              maxLength={20}
              className={detailField}
            />
          </label>
        ))}
      </div>
      <label>
        <span className="block text-[13px] text-muted mb-1">علامة مميزة (اختياري)</span>
        <input
          value={details.landmark}
          onChange={(e) => setDetails((d) => ({ ...d, landmark: e.target.value }))}
          maxLength={120}
          placeholder="مثلاً: قدام الصيدلية، البوابة التانية"
          className={detailField}
        />
      </label>

      {!firstOne && !initial?.isDefault && (
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="isDefault" className="w-4 h-4 accent-[var(--color-primary)]" />
          خليه العنوان الأساسي (يتملي لوحده لما تطلب)
        </label>
      )}

      <div className="flex items-center gap-2">
        <SaveButton />
        <button type="button" onClick={onDone} className="rounded-xl px-4 py-2.5 font-bold text-ink-2">
          إلغاء
        </button>
      </div>
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="rounded-xl bg-primary text-white px-5 py-2.5 font-bold disabled:opacity-50">
      {pending ? "بنحفظ…" : "احفظ العنوان"}
    </button>
  );
}
