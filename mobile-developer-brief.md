# Mobile App Developer Brief — انقلي (Naqla)
_Status as of 1 Nov 2026 · repo `mohamedgamil777-cloud/naqla`, branch `main`_

## 1. What the apps are
- Two **Capacitor 8** shells (Android + iOS) that load the live website. Screens and logic live on the website, so most changes need **no store release**.

| App | Folder | App ID | Store name now | Loads |
|---|---|---|---|---|
| Customer | `mobile/customer` | `com.naqla.app` | نقلة | `https://naqla-sandy.vercel.app` |
| Driver | `mobile/driver` | `com.naqla.driver` | نقلة سواق | `…/driver` |

- Build steps: `mobile/README.md` (`npm install` → `npx cap sync` → `npx cap open android|ios`).

## 2. Done ✅
- Native Android and iOS projects for both apps (iOS uses Swift Package Manager, no CocoaPods).
- Icons, splash screen, Arabic RTL, portrait only.
- Location, camera and photo permissions with Arabic explanations.
- Offline screen with a retry button.
- `tel:`, WhatsApp and Maps links open the phone's own apps.
- User-agent ends with `NaqlaApp`.
- Mobile API v1 (`src/app/api/v1/*`), ready if native screens are added later:
  - Bearer-token login (OTP)
  - `bootstrap`, `me`, `addresses`, `estimate`
  - `orders`, rate an order, proof-of-delivery photo upload
  - Driver orders, advancing order status, driver availability
- Backend: TypeScript compiles, 31/31 tests pass.

## 3. Needs a decision ⚠️
1. **Brand name:** the website was rebranded to **انقلي / enqelly**, but the apps still say **نقلة** and use `com.naqla.*` IDs. App IDs **cannot change after the first upload**. Confirm the final name and IDs before publishing.
2. **Login method:** the apps currently use **OTP** login. A switch to phone + password was **reverted today** because production returned 500 on every request. Final login flow: TBD.
3. **Domain:** the apps point to `naqla-sandy.vercel.app`. If a real domain is coming, change it now (in `capacitor.config.json` → `server.url`), before release.

## 4. To do (developer) 📋
1. **Signing:** Android upload keystore and iOS certificates, created in the company's own Play and Apple accounts. Back up the keystore.
2. **Push notifications:** Firebase project, `google-services.json`, APNs key, `@capacitor/push-notifications`.
   - ⚠️ The backend has **no device-token endpoint yet**. It needs to be built: register the token, then send a push from `src/services/notify.ts`.
3. **Store listings:** screenshots, Arabic description, privacy policy URL, Play "Data safety" form, Apple "App Privacy" form. The apps collect location and phone number.
4. **Real-device testing:**
   - order flow
   - login
   - map and "my location"
   - calling the driver
   - driver proof-of-delivery photo
   - offline screen
5. **Apple review risk:** Apple may reject an app that is "just a website". Push notifications, camera, location and the offline screen help; mention them in the review notes.

## 5. Versions
- Both apps: `versionCode 1` / `versionName "1.0"`. Not uploaded to either store yet.
- Needs: Node 22+, Android Studio + JDK 21, Mac with Xcode 26+.
