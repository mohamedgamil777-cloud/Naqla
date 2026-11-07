# Pickup / drop-off locations — how they work

_Inspection 2026-11-07, before the location / route-distance changes in this branch._

## Before (as found)

| Area | Implementation |
|---|---|
| Browser Maps loading | `lib/google-maps.ts` — Maps JavaScript API (`v=weekly`, `language=ar`, `region=EG`), loaded once with `GOOGLE_MAPS_API_KEY` (a browser key, referrer-restricted). |
| Address autocomplete | Places API (New): `AutocompleteSuggestion.fetchAutocompleteSuggestions` with an `AutocompleteSessionToken`, `includedRegionCodes: ["eg"]`, `locationBias` 30 km around the current pin / branch. Pick → `Place.fetchFields(["location","formattedAddress","displayName"])` (ends the session). |
| Reverse / forward geocoding | `google.maps.Geocoder` in the browser (`reverseGeocode`, `geocodeAddress` for text typed on the home page). |
| Map + pins | `use-delivery-map.ts` — `AdvancedMarkerElement` pins, draggable (`gmpDraggable`), map tap places the active stop. |
| GPS | `lib/geolocation.ts` — only on a button tap; GPS first, network fallback; `LocationHelp` sheet on failure. |
| Address details | building / floor / apartment / landmark (optional), composed into `pickupDetails` / `dropoffDetails`. |
| Coordinates stored | `delivery_orders.pickup_lat/lng`, `dropoff_lat/lng` (`real`, nullable). No Place ID column. |
| **Distance** | **Browser**: straight line × 1.3 (`roadKm` in `model.ts`). Customer can edit it (`DistanceBar` → "تعديل"). Without a Maps key the customer types the km (default 5). |
| Quote | `POST /api/estimate` (also `/api/v1/estimate` for the mobile app) `{categoryId, km, loaders, promoCode}` → `estimateDelivery` → `computeDeliveryQuote` (base fare + km × perKm + loaders, coupon / company discount, VAT). |
| Order | `POST /api/orders` (also `/api/v1/orders`) re-prices on the server **with the km sent by the browser**. |
| Staff phone orders | Agent types the km (`phoneOrderInputSchema`) — staff tool, unchanged. |

## Risks found

1. **The price depends on a distance the browser sends.** Both `/api/estimate` and `/api/orders` accept any `km` — a customer (or a bug) can order a 40 km trip for the price of 1 km.
2. The distance is straight-line × 1.3, not the road distance (wrong across the Nile, ring roads, between cities).
3. The live site has no `GOOGLE_MAPS_API_KEY`, so the order page runs in "plain" mode: typed addresses, no map, and a customer-typed km.
4. The mobile app (`/api/v1/*`) shares the same endpoints and sends only `km`.

## After (this change)

- New `services/route-service.ts` (server only):
  - Points come from the browser's coordinates (checked: finite, inside Egypt) or, when none, from **server-side geocoding** of the typed address.
  - Road distance from the **Routes API** (`directions/v2:computeRoutes`, `DRIVE`, field mask `routes.distanceMeters`), cached per instance.
  - Needs a **server key**: `GOOGLE_MAPS_SERVER_KEY` (APIs: Routes API, Geocoding API; restrict by API, not referrer).
- `/api/estimate` and `/api/orders` take `pickupLat/Lng`, `dropoffLat/Lng`, `pickupAddress`, `dropoffAddress`; the server works out the km and passes it to the **unchanged** `estimateDelivery` / `computeDeliveryQuote`. The estimate response gains `km` and `distanceSource`; the rest is the same shape.
- If Google cannot find a route the API answers `ROUTE_FAILED` (no price) and the page asks the customer to check the addresses / retry.
- Fallbacks while the server key is not configured (so the live site keeps working): both pins known → straight line × 1.3 computed **on the server** (same as before, but no longer taken from the browser); no pins (plain mode) → the old customer-entered km. Once `GOOGLE_MAPS_SERVER_KEY` is set, a browser-sent km is never used for customer quotes or orders.
- Orders now store the pins the price was measured between (the geocoded points when the page sent none).
- Place IDs are **not stored**: there is no column for them and adding one needs a database migration (left as a follow-up; coordinates are the source of truth).
- Order page: "استخدم موقعي الحالي" (GPS, only on tap) and "حدد على الخريطة" on both stops; a "تم تحديد المكان" confirmation; the distance is read-only once the server measured it; route problems show a message + "جرّب تاني" and block ordering.
- The mobile app (`/api/v1/*`) must send `pickupLat/Lng`, `dropoffLat/Lng` (or addresses) instead of `km` once the server key is set.
