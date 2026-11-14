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
  style: { display: "flex", width: "100%", height: "100%", backgroundColor: "#f4eee7", alignItems: "center", justifyContent: "center" },
},
// Both the landscape card and its central 630px square retain the complete visible mascot.
// Safari may reuse og:image as a square share-sheet thumbnail; keep lettering out of this image.
createElement("img", { src: `data:image/png;base64,${source.toString("base64")}`, width: 540, height: 540 })), { width: 1200, height: 630 });
const rendered = Buffer.from(await cover.arrayBuffer());
if (!(await sharp(rendered).stats()).isOpaque) throw Error("Share-cover canvas must be opaque");
const png = await sharp(rendered).removeAlpha().png({ compressionLevel: 9, palette: false }).toBuffer();
await mkdir("public/brand", { recursive: true });
await writeFile("public/brand/share-cover-v2.png", png);
console.log("share-cover-v2.png 1200x630 RGB; centered logo for landscape and square crops; icon assets unchanged");
