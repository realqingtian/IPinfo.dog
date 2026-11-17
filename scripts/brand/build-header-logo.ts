import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";

// Preserve the approved original and its full transparent canvas.
const original = await readFile("assets/brand/logo.png");
if (createHash("sha256").update(original).digest("hex") !== "89f74a8e8bd5536972b640b160c719d2cb92e5ae2814490580f85b75745a3b50") {
  throw Error("Approved brand original changed");
}
// The header displays 36 CSS pixels: 144 pixels covers up to 4x density.
const size = 144;
const resized = await sharp(original).resize(size, size, { fit: "contain", kernel: "lanczos3" }).ensureAlpha().raw().toBuffer();
const webp = await sharp(resized, { raw: { width: size, height: size, channels: 4 } }).webp({ lossless: true, effort: 6 }).toBuffer();
const decoded = await sharp(webp).ensureAlpha().raw().toBuffer();
// Lossless encoding must preserve alpha and every visible pixel after resizing.
for (let i = 0; i < resized.length; i += 4) {
  if (resized[i + 3] !== decoded[i + 3] || resized[i + 3] > 0 && !resized.subarray(i, i + 3).equals(decoded.subarray(i, i + 3))) {
    throw Error("Header logo encoding changed visible pixels");
  }
}
if (webp.length > 32 * 1024) throw Error("Header logo exceeds its transfer budget");
await writeFile("assets/brand/header-logo.webp", webp);
console.log(JSON.stringify({ size, densityAt36px: 4, originalBytes: original.length, bytes: webp.length, losslessVisiblePixels: true }));
