import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { coverVariants, renderCover } from "./cover-renderer.ts";

// Icons remain separate, logo-only assets. Safari may also crop this wide OG
// image into a small share-sheet preview; it is not a second app icon.
const candidates = [];
for (const variant of coverVariants) {
  const png = await renderCover(variant, "wide");
  const raw = await sharp(png).raw().toBuffer();
  for (let y = 0; y < 630; y++) for (let x = 0; x < 1200; x++) {
    const i = (y * 1200 + x) * 3;
    const difference = Math.max(...[244, 238, 231].map((v, c) => Math.abs(raw[i + c] - v)));
    if (difference !== 0 && (x < 96 || x >= 1104)) {
      throw Error(`${variant.locale}: content exceeds the central 1.6:1 landscape crop`);
    }
  }
  candidates.push({ locale: variant.locale, png });
}
await mkdir("public/brand", { recursive: true });
for (const { locale, png } of candidates) {
  const path = `public/brand/share-cover-v7-${locale.toLowerCase()}.png`;
  await writeFile(path, png);
  console.log(`${path}: 1200x630 RGB; landscape brand preview; icons unchanged`);
}
