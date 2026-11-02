"use client";
/**
 * Google Maps in the browser: one script load per page, then small helpers for place search
 * (Places API New), place lookup and (reverse) geocoding. Everything is Arabic and limited to Egypt.
 * Needs these APIs on the key: Maps JavaScript API, Places API (New), Geocoding API.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface PlaceSuggestion {
  id: string;
  main: string;
  secondary: string;
  prediction: google.maps.places.PlacePrediction;
}

declare global {
  interface Window {
    __naqlaMapsReady?: () => void;
    gm_authFailure?: () => void;
  }
}

let loading: Promise<void> | null = null;
const authListeners = new Set<() => void>();

/** Loads the Maps JavaScript API once. Rejects on network failure; key problems arrive via onAuthFailure. */
export function loadGoogleMaps(apiKey: string): Promise<void> {
  // the types declare `google` as always present; before the script loads it isn't
  if ((window as { google?: typeof google }).google?.maps) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    window.__naqlaMapsReady = () => resolve();
    // Google calls this when the key is invalid, restricted or missing an API
    window.gm_authFailure = () => authListeners.forEach((fn) => fn());
    const s = document.createElement("script");
    s.src =
      "https://maps.googleapis.com/maps/api/js?" +
      new URLSearchParams({
        key: apiKey,
        v: "weekly",
        language: "ar",
        region: "EG",
        loading: "async",
        callback: "__naqlaMapsReady",
      });
    s.async = true;
    s.onerror = () => {
      loading = null;
      reject(new Error("Google Maps failed to load"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

/** Called when Google rejects the key (wrong key, referrer restriction, API not enabled). */
export function onMapsAuthFailure(fn: () => void): () => void {
  authListeners.add(fn);
  return () => authListeners.delete(fn);
}

/** Drops what means nothing to a driver: a leading plus code ("XX5R+28H"), the country and the
 *  postal code — every order is in Egypt. */
function tidyAddress(address: string): string {
  return address
    .replace(/^[23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{2,3}[،,]?\s*/u, "")
    .replace(/[،,]\s*(مصر|Egypt)\s*$/u, "")
    .replace(/\s+[\d٠-٩]{4,8}\s*$/u, "")
    .trim();
}

/** Street address for a point, or null when Google has nothing better than a plus code. */
export async function reverseGeocode(point: LatLng): Promise<string | null> {
  const { Geocoder } = (await google.maps.importLibrary("geocoding")) as google.maps.GeocodingLibrary;
  const { results } = await new Geocoder().geocode({ location: point, language: "ar" });
  const best = results.find((r) => !r.types.includes("plus_code")) ?? null;
  return best ? tidyAddress(best.formatted_address) : null;
}

/** Point + tidy address for free text (e.g. typed on the home page). */
export async function geocodeAddress(text: string): Promise<{ point: LatLng; address: string } | null> {
  const { Geocoder } = (await google.maps.importLibrary("geocoding")) as google.maps.GeocodingLibrary;
  const { results } = await new Geocoder().geocode({
    address: text,
    language: "ar",
    region: "eg",
    componentRestrictions: { country: "EG" },
  });
  const r = results[0];
  if (!r) return null;
  return { point: r.geometry.location.toJSON(), address: tidyAddress(r.formatted_address) };
}

/** A token groups one search session (typing + the pick) into one billable request. */
export async function newSearchSession(): Promise<google.maps.places.AutocompleteSessionToken> {
  const { AutocompleteSessionToken } = (await google.maps.importLibrary(
    "places",
  )) as google.maps.PlacesLibrary;
  return new AutocompleteSessionToken();
}

export async function suggestPlaces(
  input: string,
  sessionToken: google.maps.places.AutocompleteSessionToken,
  near: LatLng,
): Promise<PlaceSuggestion[]> {
  const { AutocompleteSuggestion } = (await google.maps.importLibrary("places")) as google.maps.PlacesLibrary;
  const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input,
    sessionToken,
    language: "ar",
    region: "eg",
    includedRegionCodes: ["eg"],
    locationBias: { center: near, radius: 30000 },
  });
  return suggestions.slice(0, 6).flatMap((s) => {
    const p = s.placePrediction;
    if (!p) return [];
    return [
      {
        id: p.placeId,
        main: p.mainText?.text ?? p.text.text,
        secondary: p.secondaryText?.text ?? "",
        prediction: p,
      },
    ];
  });
}

/** Location and address of a picked suggestion (closes the search session). */
export async function placeDetails(s: PlaceSuggestion): Promise<{ point: LatLng; address: string } | null> {
  const place = s.prediction.toPlace();
  await place.fetchFields({ fields: ["location", "formattedAddress", "displayName"] });
  if (!place.location) return null;
  const name =
    place.displayName && !place.formattedAddress?.includes(place.displayName) ? `${place.displayName}، ` : "";
  return { point: place.location.toJSON(), address: tidyAddress(name + (place.formattedAddress ?? s.main)) };
}

/** Teardrop pin used on every map: red ring = pickup, teal square = drop-off (same as the forms). */
export function pinElement(kind: "a" | "b"): HTMLElement {
  const bg = kind === "a" ? "#d9452b" : "#0b6b5b";
  const glyph =
    kind === "a"
      ? '<circle cx="12" cy="11" r="3.4" fill="none" stroke="#fff" stroke-width="2.4"/>'
      : '<rect x="8.6" y="7.6" width="6.8" height="6.8" rx="1.2" fill="#fff"/>';
  const el = document.createElement("div");
  el.innerHTML =
    '<svg width="34" height="44" viewBox="0 0 24 31" style="display:block;filter:drop-shadow(0 2px 2px rgba(0,0,0,.3))">' +
    `<path d="M12 30s9-8.6 9-17.5A9 9 0 0 0 3 12.5C3 21.4 12 30 12 30z" fill="${bg}"/>${glyph}</svg>`;
  return el;
}
