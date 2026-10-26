# Naqla mobile apps (Android + iOS)

Two store apps built with **Capacitor 8**. Each one opens the live Naqla site inside a native app shell,
so every change made on the website (and in admin) appears in the apps instantly — no new store release needed.

| App | Folder | Store name | App ID (bundle / package) | Opens |
| --- | --- | --- | --- | --- |
| Customer | `customer/` | نقلة | `com.naqla.app` | `https://naqla-sandy.vercel.app` |
| Driver | `driver/` | نقلة سواق | `com.naqla.driver` | `https://naqla-sandy.vercel.app/driver` |

> The App IDs can't be changed after the first upload. Confirm them with Naqla before publishing.

## What's already done

- Native Android project (`android/`) and iOS project (`ios/`, Swift Package Manager — no CocoaPods) for both apps
- App icons (incl. Android adaptive icon) and splash screens in brand colours
- Arabic app names, RTL, portrait only on phones
- Permissions with Arabic explanations: location (both apps), camera + photos (driver, for proof of delivery)
- Offline screen (`www/offline.html`) with a retry button when there's no internet
- Phone (`tel:`), WhatsApp and Google Maps links open the phone's own apps
- User-agent ends with `NaqlaApp`, so the website can tell it's running inside the app

## Requirements

- Node.js 22+
- **Android:** Android Studio (latest) with JDK 21
- **iOS:** a Mac with Xcode 26+
- Google Play Console account ($25 one-time) and Apple Developer account ($99/year), both owned by Naqla

## Build

```bash
cd mobile/customer        # or mobile/driver
npm install
npx cap sync
npx cap open android      # Android Studio → Build → Generate Signed App Bundle (.aab)
npx cap open ios          # Xcode → set Team & signing → Product → Archive
```

Before each release, raise the version:
- Android: `android/app/build.gradle` → `versionCode` (+1 every upload) and `versionName`
- iOS: Xcode → target App → General → Version / Build

## Change something

| Change | Where | Then |
| --- | --- | --- |
| Website address (e.g. a new domain) | `capacitor.config.json` → `server.url` | `npx cap sync`, new store release |
| Icon / splash | from `mobile/`: `node make-assets.cjs customer/assets` (reads `public/brand`) | `npm run icons`, `npx cap sync` |
| Permissions / orientation | edit `native-tweaks.py`, run `python native-tweaks.py` from `mobile/` | `npx cap sync` |
| Screens, texts, prices | the website / admin | nothing — apps update live |

## Still to do (developer)

1. **Signing:** create the Android upload keystore and iOS certificates in Naqla's accounts. Keep the keystore safe — losing it blocks future updates.
2. **Push notifications:** create a Firebase project, add `google-services.json` (Android) and an APNs key (iOS), install `@capacitor/push-notifications`, and register the device token with the backend (endpoint to be provided).
3. **Store listings:** screenshots, Arabic description, privacy policy URL, Data safety form (Play) and App Privacy (Apple). Location and phone number are collected.
4. **Test on real phones:** order flow, OTP login, map + "my location", calling the driver, driver proof-of-delivery photo, no-internet screen.

Apple may reject apps that are "just a website". Push notifications, camera, location and the offline screen help pass review; mention them in the review notes.
