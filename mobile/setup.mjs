// Writes the per-app files for mobile/customer and mobile/driver.
// Run once from mobile/:  node setup.mjs
import { mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const SITE = "https://naqla-sandy.vercel.app";

const apps = [
  { dir: "customer", appId: "com.naqla.app", appName: "نقلة", path: "/" },
  { dir: "driver", appId: "com.naqla.driver", appName: "نقلة سواق", path: "/driver" },
];

const offline = (startUrl) => `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>نقلة</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f7f4ec; color: #10201c;
         font-family: system-ui, "Segoe UI", Tahoma, sans-serif; text-align: center; padding: 24px; box-sizing: border-box; }
  img { width: 140px; }
  h1 { font-size: 1.4rem; margin: 20px 0 6px; }
  p { color: #5b6b66; margin: 0 0 22px; }
  button { background: #f2a541; color: #10201c; border: 0; border-radius: 16px; padding: 14px 32px; font-size: 1.1rem; font-weight: 800; }
</style>
</head>
<body>
  <div>
    <img src="logo.png" alt="نقلة">
    <h1>مفيش اتصال بالإنترنت</h1>
    <p>اتأكد إن النت شغال وجرّب تاني</p>
    <button onclick="location.href='${startUrl}'">جرّب تاني</button>
  </div>
</body>
</html>
`;

for (const a of apps) {
  const root = a.dir;
  const startUrl = SITE + (a.path === "/" ? "" : a.path);
  mkdirSync(join(root, "www"), { recursive: true });
  mkdirSync(join(root, "assets"), { recursive: true });

  writeFileSync(
    join(root, "package.json"),
    JSON.stringify(
      {
        name: `naqla-${a.dir}-app`,
        private: true,
        version: "1.0.0",
        scripts: {
          sync: "cap sync",
          android: "cap open android",
          ios: "cap open ios",
          icons: "capacitor-assets generate --iconBackgroundColor #ffffff --iconBackgroundColorDark #ffffff --splashBackgroundColor #f7f4ec --splashBackgroundColorDark #f7f4ec",
        },
      },
      null,
      2,
    ) + "\n",
  );

  writeFileSync(
    join(root, "capacitor.config.json"),
    JSON.stringify(
      {
        appId: a.appId,
        appName: a.appName,
        webDir: "www",
        backgroundColor: "#f7f4ec",
        appendUserAgent: "NaqlaApp",
        server: { url: startUrl, errorPath: "offline.html", androidScheme: "https" },
        android: { allowMixedContent: false },
        ios: { contentInset: "never" },
        plugins: {
          SplashScreen: { launchShowDuration: 1000, backgroundColor: "#f7f4ec", showSpinner: false },
        },
      },
      null,
      2,
    ) + "\n",
  );

  writeFileSync(join(root, "www", "index.html"), offline(startUrl));
  writeFileSync(join(root, "www", "offline.html"), offline(startUrl));
  copyFileSync("../public/brand/logo.png", join(root, "www", "logo.png"));
  // icon + splash source images for `npm run icons`: node make-assets.cjs <dir>/assets
  console.log("wrote", root);
}
