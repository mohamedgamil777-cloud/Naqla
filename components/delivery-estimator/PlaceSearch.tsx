"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/Icons";
import {
  loadGoogleMaps,
  newSearchSession,
  placeDetails,
  suggestPlaces,
  type LatLng,
  type PlaceSuggestion,
} from "@/lib/google-maps";

type PlaceSearchProps = {
  apiKey: string;
  /** maps failed to load → a plain address field */
  plain: boolean;
  /** the stop's current address (shown when not typing) */
  address: string;
  near: LatLng;
  label: string;
  missing: boolean;
  onFocus: () => void;
  /** a suggestion was picked: its point and address */
  onPick: (point: LatLng, address: string) => void;
  /** plain mode only: the typed address */
  onType: (address: string) => void;
};

/** Search box with Google place suggestions (combobox: ↑ ↓ Enter Escape). */
export function PlaceSearch({
  apiKey,
  plain,
  address,
  near,
  label,
  missing,
  onFocus,
  onPick,
  onType,
}: PlaceSearchProps) {
  const listId = useId();
  const [query, setQuery] = useState(address);
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const session = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const typed = useRef(false);

  // the address can also change from the map, "my location" or a saved address
  useEffect(() => {
    typed.current = false;
    setQuery(address);
  }, [address]);

  useEffect(() => {
    if (plain || !typed.current) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        await loadGoogleMaps(apiKey);
        session.current ??= await newSearchSession();
        const found = await suggestPlaces(q, session.current, near);
        if (cancelled) return;
        setResults(found);
        setHighlight(found.length ? 0 : -1);
        setFailed(false);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // near is only a bias; re-searching when it moves isn't useful
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, plain, apiKey]);

  async function pick(s: PlaceSuggestion) {
    setOpen(false);
    setQuery(s.main);
    setBusy(true);
    try {
      const found = await placeDetails(s);
      session.current = null; // the pick ends this search session
      if (found) onPick(found.point, found.address);
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && highlight >= 0) {
      e.preventDefault();
      void pick(results[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showList =
    open && !plain && query.trim().length >= 2 && (results.length > 0 || (!busy && typed.current));

  return (
    <div className="relative">
      <Icon
        name={busy ? "clock" : "search"}
        className="absolute start-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted pointer-events-none"
      />
      <input
        role="combobox"
        aria-label={label}
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && highlight >= 0 ? `${listId}-${highlight}` : undefined}
        aria-invalid={missing || undefined}
        value={query}
        onChange={(e) => {
          typed.current = true;
          setQuery(e.target.value);
          setOpen(true);
          if (plain) onType(e.target.value);
        }}
        onFocus={() => {
          onFocus();
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        placeholder={plain ? "المنطقة، الشارع، رقم العمارة" : "ابحث عن المكان أو حدده على الخريطة"}
        autoComplete="off"
        className={`w-full rounded-xl border bg-panel ps-10 pe-3.5 py-2.5 text-base font-medium text-ink outline-none transition placeholder:text-muted/70 placeholder:font-normal focus:border-primary focus:ring-3 focus:ring-primary/15 ${
          missing ? "border-booked ring-3 ring-booked/15" : "border-line-2 hover:border-ink-2/40"
        }`}
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute z-40 inset-x-0 top-full mt-1 max-h-72 overflow-y-auto rounded-xl border border-line bg-panel shadow-lg py-1"
        >
          {results.length === 0 ? (
            <li className="px-3.5 py-3 text-sm text-muted">
              مفيش نتايج — جرّب اسم منطقة أو شارع، أو حدد المكان على الخريطة.
            </li>
          ) : (
            results.map((s, i) => (
              <li
                key={s.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === highlight}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void pick(s)}
                onMouseEnter={() => setHighlight(i)}
                className={`flex items-start gap-3 px-3.5 py-2.5 cursor-pointer ${i === highlight ? "bg-panel-2" : ""}`}
              >
                <Icon name="mapPin" className="w-4 h-4 mt-1 shrink-0 text-muted" />
                <span className="min-w-0">
                  <span className="block font-semibold truncate">{s.main}</span>
                  {s.secondary && <span className="block text-sm text-muted truncate">{s.secondary}</span>}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
      {failed && !plain && (
        <p className="mt-1.5 text-sm text-booked">البحث مش شغال دلوقتي — حدد المكان على الخريطة.</p>
      )}
    </div>
  );
}
