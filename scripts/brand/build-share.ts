import { createElement } from "react";
import { ImageResponse } from "next/og.js";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";

// A separate landscape canvas: never regenerate or resize the validated app icons here.
const source = await readFile("assets/brand/logo.png");
if (createHash("sha256").update(source).digest("hex") !== "89f74a8e8bd5536972b640b160c719d2cb92e5ae2814490580f85b75745a3b50") {
  throw Error("Approved brand original changed; review before generating the share cover");
}
const cover = new ImageResponse(createElement("div", {
  style: { display: "flex", width: "100%", height: "100%", backgroundColor: "#f4eee7", alignItems: "center", justifyContent: "center", padding: "70px", gap: "40px" },
},
createElement("img", { src: `data:image/png;base64,${source.toString("base64")}`, width: 420, height: 420 }),
createElement("div", { style: { display: "flex", fontSize: "78px", fontWeight: 700, color: "#202124", letterSpacing: "-3px", whiteSpace: "nowrap" } }, "IPinfo.dog")), { width: 1200, height: 630 });
const rendered = Buffer.from(await cover.arrayBuffer());
if (!(await sharp(rendered).stats()).isOpaque) throw Error("Share-cover canvas must be opaque");
const png = await sharp(rendered).removeAlpha().png({ compressionLevel: 9, palette: false }).toBuffer();
await mkdir("public/brand", { recursive: true });
await writeFile("public/brand/share-cover-v1.png", png);
console.log("share-cover-v1.png 1200x630 RGB; approved artwork and icon assets unchanged");
