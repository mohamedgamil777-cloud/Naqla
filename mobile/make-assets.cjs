// Usage (from mobile/): node make-assets.cjs customer/assets
// Builds 1024 icon + adaptive layers + 2732 splash for @capacitor/assets.
const sharp = require("../node_modules/sharp");
const pub = require("node:path").join(__dirname, "../public");
const out = process.argv[2];

(async () => {
  const S = 1024;
  const markW = Math.round(S * 0.72);
  const mark = await sharp(`${pub}/brand/mark.png`).resize({ width: markW }).toBuffer();
  const markA = await sharp(`${pub}/brand/mark.png`).resize({ width: Math.round(S * 0.56) }).toBuffer();
  const white = { create: { width: S, height: S, channels: 4, background: "#ffffff" } };
  const clear = { create: { width: S, height: S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } };
  await sharp(white).composite([{ input: mark, gravity: "center" }]).png().toFile(`${out}/icon-only.png`);
  await sharp(clear).composite([{ input: markA, gravity: "center" }]).png().toFile(`${out}/icon-foreground.png`);
  await sharp(white).png().toFile(`${out}/icon-background.png`);

  const P = 2732;
  const logo = await sharp(`${pub}/brand/logo-full.png`).resize({ width: 1000 }).toBuffer();
  const cream = { create: { width: P, height: P, channels: 4, background: "#f7f4ec" } };
  await sharp(cream).composite([{ input: logo, gravity: "center" }]).png().toFile(`${out}/splash.png`);
  await sharp(cream).composite([{ input: logo, gravity: "center" }]).png().toFile(`${out}/splash-dark.png`);
  console.log("ok", out);
})();
