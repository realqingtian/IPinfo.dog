import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { coverVariants, renderCover } from "./cover-renderer.ts";

// Check every candidate before publishing any file. Safari may crop one OG image
// into different shapes; the complete left-mascot/right-text group must fit both.
const candidates = [];
for (const variant of coverVariants) {
  const png = await renderCover(variant, "compact-row");
  const raw = await sharp(png).raw().toBuffer();
  for (let y = 0; y < 630; y++) for (let x = 0; x < 1200; x++) {
    const i = (y * 1200 + x) * 3;
    const difference = Math.max(...[244, 238, 231].map((v, c) => Math.abs(raw[i + c] - v)));
    if (difference !== 0 && (x < 285 || x >= 915)) {
      throw Error(`${variant.locale}: content extends outside the central square`);
    }
    if (difference > 12 && Math.hypot(x - 600, y - 315) > 315) {
      throw Error(`${variant.locale}: visible content exceeds circular crop safety`);
    }
  }
  candidates.push({ locale: variant.locale, png });
}
await mkdir("public/brand", { recursive: true });
for (const { locale, png } of candidates) {
  const path = `public/brand/share-cover-v5-${locale.toLowerCase()}.png`;
  await writeFile(path, png);
  console.log(`${path}: 1200x630 RGB; complete brand group inside square/circle crop`);
}
