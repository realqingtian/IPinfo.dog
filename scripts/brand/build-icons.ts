import { createElement } from "react";
import { ImageResponse } from "next/og.js";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";

// Preserve the approved artwork. Only the surrounding web-icon canvas is composed.
const source = await readFile(path.join(process.cwd(), "assets/brand/logo.png"));
const expected = "89f74a8e8bd5536972b640b160c719d2cb92e5ae2814490580f85b75745a3b50";
if (createHash("sha256").update(source).digest("hex") !== expected) throw Error("Brand original changed; review the approved artwork before regenerating icons");
const directory = path.join(process.cwd(), "public/icons");
await mkdir(directory, { recursive: true });
const version = "v3";
const entries = [
  ["apple-touch-icon", 180], ["apple-touch-icon", 167], ["apple-touch-icon", 152],
  ["icon", 16], ["icon", 32], ["icon", 48], ["icon", 192], ["icon", 512], ["icon", 1024],
  ["maskable", 192], ["maskable", 512],
] as const;
for (const [name, size] of entries) {
  // Visible artwork stays inside the central 80%-diameter safe circle.
  // Keep this separate from ordinary icons, where this padding is unwanted.
  const artworkSize = name === "maskable" ? Math.round(size * 0.68) : size;
  const icon = new ImageResponse(createElement("div", {
    style: { display: "flex", width: "100%", height: "100%", backgroundColor: "#f4eee7", alignItems: "center", justifyContent: "center" },
  }, createElement("img", { src: `data:image/png;base64,${source.toString("base64")}`, width: artworkSize, height: artworkSize })), { width: size, height: size });
  const rendered = Buffer.from(await icon.arrayBuffer());
  if (!(await sharp(rendered).stats()).isOpaque) throw Error("Web-icon canvas must be opaque before encoding");
  // Encode opaque RGB, rather than RGBA with an unused alpha channel.
  // This changes the container, not the rendered RGB pixels or approved artwork.
  const png = await sharp(rendered).removeAlpha().png({ compressionLevel: 9, palette: false }).toBuffer();
  await writeFile(path.join(directory, `${name}-${size}-${version}.png`), png);
  if (name === "apple-touch-icon" && size === 180) await writeFile(path.join(process.cwd(), "public/apple-touch-icon.png"), png);
  console.log(`${name}-${size}-${version}.png ${size}x${size}`);
}
// Traditional bottom-up 32-bit DIB frames plus an opaque AND mask.
// Keep a 16px frame for small history/tab contexts and avoid PNG-in-ICO decoding differences.
const sizes = [16, 32, 48];
const frames = await Promise.all(sizes.map(async size => {
  const rgb = await sharp(path.join(directory, `icon-${size}-${version}.png`)).raw().toBuffer();
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const sourceOffset = (y * size + x) * 3;
    const targetOffset = ((size - 1 - y) * size + x) * 4;
    pixels[targetOffset] = rgb[sourceOffset + 2];
    pixels[targetOffset + 1] = rgb[sourceOffset + 1];
    pixels[targetOffset + 2] = rgb[sourceOffset];
    pixels[targetOffset + 3] = 255;
  }
  const mask = Buffer.alloc(Math.ceil(size / 32) * 4 * size);
  const dib = Buffer.alloc(40);
  dib.writeUInt32LE(40, 0); dib.writeInt32LE(size, 4); dib.writeInt32LE(size * 2, 8);
  dib.writeUInt16LE(1, 12); dib.writeUInt16LE(32, 14); dib.writeUInt32LE(pixels.length + mask.length, 20);
  return Buffer.concat([dib, pixels, mask]);
}));
const header = Buffer.alloc(6 + sizes.length * 16); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
for (const [index, size] of sizes.entries()) {
  const start = 6 + index * 16;
  header[start] = size; header[start + 1] = size; header.writeUInt16LE(1, start + 4); header.writeUInt16LE(32, start + 6);
  header.writeUInt32LE(frames[index].length, start + 8); header.writeUInt32LE(offset, start + 12); offset += frames[index].length;
}
const ico = Buffer.concat([header, ...frames]);
await writeFile(path.join(process.cwd(), "public/favicon.ico"), ico);
await writeFile(path.join(process.cwd(), `public/favicon-${version}.ico`), ico);

// The current browser favicon uses its own treatment; keep this entry point
// reproducible without replacing the Apple / Android artwork above.
await import("./build-favicons.ts");
