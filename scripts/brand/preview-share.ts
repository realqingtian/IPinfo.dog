import { createElement } from "react";
import { ImageResponse } from "next/og.js";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";

// Design previews only: never write public assets, metadata or the approved logo.
const source = await readFile("assets/brand/logo.png");
if (createHash("sha256").update(source).digest("hex") !== "89f74a8e8bd5536972b640b160c719d2cb92e5ae2814490580f85b75745a3b50") {
  throw Error("Approved brand original changed");
}
const latin = await readFile("node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf");
const variants = [
  { locale: "zh-CN", description: "你的 IP，一目了然。", font: "sc" },
  { locale: "zh-TW", description: "你的 IP，一目瞭然。", font: "tc" },
  { locale: "en", description: "Your IP, at a glance.", font: "sc" },
];
const out = "docs/archive/m2/m2-ux-02-mobile-icons";
for (const variant of variants) {
  const chinese = await readFile(`assets/brand/preview-fonts/noto-sans-${variant.font}-subset.ttf`);
  const image = new ImageResponse(createElement("div", {
    style: { display: "flex", width: "100%", height: "100%", backgroundColor: "#f4eee7", position: "relative", alignItems: "center", color: "#282522" },
  },
  createElement("img", { src: `data:image/png;base64,${source.toString("base64")}`, width: 480, height: 480, style: { position: "absolute", left: 100, top: 75 } }),
  createElement("div", { style: { display: "flex", position: "absolute", left: 594, top: 229, fontFamily: "Brand", fontSize: 76, letterSpacing: -3, lineHeight: 1.1, backgroundImage: "linear-gradient(100deg, #292524 0%, #7c4a36 60%, #a94b27 100%)", backgroundClip: "text", color: "transparent" } }, "IPinfo.dog"),
  createElement("div", { style: { display: "flex", position: "absolute", left: 599, top: 334, fontFamily: "Brand, Localized", fontSize: 34, color: "#776e66", lineHeight: 1.3 } }, variant.description)), {
    width: 1200, height: 630,
    fonts: [
      { name: "Brand", data: latin, weight: 400, style: "normal" },
      { name: "Localized", data: chinese, weight: 500, style: "normal" },
    ],
  });
  const png = await sharp(Buffer.from(await image.arrayBuffer())).removeAlpha().png({ compressionLevel: 9, palette: false }).toBuffer();
  const path = `${out}/light-banner-${variant.locale.toLowerCase()}.png`;
  await writeFile(path, png);
  console.log(`${variant.locale}: ${variant.description} → ${path}`);
}
