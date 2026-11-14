import { createElement } from "react";
import { ImageResponse } from "next/og.js";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";

// Browser favicons have their own rounded tile. Apple / PWA icons and the
// approved illustration are separate assets and are not regenerated here.
const source = await readFile("assets/brand/logo.png");
if (createHash("sha256").update(source).digest("hex") !== "89f74a8e8bd5536972b640b160c719d2cb92e5ae2814490580f85b75745a3b50") {
  throw Error("Approved brand original changed");
}
await mkdir("public/icons", { recursive: true });
const sizes = [16, 32, 48, 96, 192, 512];
for (const size of sizes) {
  const artworkSize = size;
  const response = new ImageResponse(createElement("div", {
    style: { display: "flex", width: "100%", height: "100%", borderRadius: Math.floor(size * 0.23), overflow: "hidden", backgroundColor: "#f4eee7", alignItems: "center", justifyContent: "center" },
  }, createElement("img", { src: `data:image/png;base64,${source.toString("base64")}`, width: artworkSize, height: artworkSize })), { width: size, height: size });
  // Transparent corners belong to favicon shapes, not to Apple touch icons.
  const png = await sharp(Buffer.from(await response.arrayBuffer())).ensureAlpha().png({ compressionLevel: 9, palette: false }).toBuffer();
  await writeFile(`public/icons/favicon-${size}-v4.png`, png);
  console.log(`favicon-${size}-v4.png ${size}x${size}; original cream palette and artwork scale; rounded corners only`);
}

// DIB frames retain both alpha and an AND mask for transparent rounded corners.
const icoSizes = [16, 32, 48, 96];
const frames = await Promise.all(icoSizes.map(async size => {
  const rgba = await sharp(`public/icons/favicon-${size}-v4.png`).ensureAlpha().raw().toBuffer();
  const pixels = Buffer.alloc(size * size * 4);
  const maskStride = Math.ceil(size / 32) * 4;
  const mask = Buffer.alloc(maskStride * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const src = (y * size + x) * 4;
    const row = size - 1 - y;
    const dst = (row * size + x) * 4;
    pixels[dst] = rgba[src + 2]; pixels[dst + 1] = rgba[src + 1];
    pixels[dst + 2] = rgba[src]; pixels[dst + 3] = rgba[src + 3];
    if (rgba[src + 3] === 0) mask[row * maskStride + (x >> 3)] |= 0x80 >> (x & 7);
  }
  const dib = Buffer.alloc(40);
  dib.writeUInt32LE(40, 0); dib.writeInt32LE(size, 4); dib.writeInt32LE(size * 2, 8);
  dib.writeUInt16LE(1, 12); dib.writeUInt16LE(32, 14); dib.writeUInt32LE(pixels.length + mask.length, 20);
  return Buffer.concat([dib, pixels, mask]);
}));
const header = Buffer.alloc(6 + icoSizes.length * 16);
header.writeUInt16LE(1, 2); header.writeUInt16LE(icoSizes.length, 4);
let offset = header.length;
for (const [index, size] of icoSizes.entries()) {
  const start = 6 + index * 16;
  header[start] = size; header[start + 1] = size;
  header.writeUInt16LE(1, start + 4); header.writeUInt16LE(32, start + 6);
  header.writeUInt32LE(frames[index].length, start + 8); header.writeUInt32LE(offset, start + 12);
  offset += frames[index].length;
}
const ico = Buffer.concat([header, ...frames]);
await writeFile("public/favicon-v4.ico", ico);
await writeFile("public/favicon.ico", ico);
