import { createElement } from "react";
import { ImageResponse } from "next/og.js";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";

export const coverVariants = [
  { locale: "zh-CN", description: "你的 IP，一目了然。", font: "sc", lines: ["你的 IP，", "一目了然。"] },
  { locale: "zh-TW", description: "你的 IP，一目瞭然。", font: "tc", lines: ["你的 IP，", "一目瞭然。"] },
  { locale: "en", description: "Your IP, at a glance.", font: "sc", lines: ["Your IP,", "at a glance."] },
] as const;

export type CoverComposition = "wide" | "stacked" | "side-labels" | "compact-row";
const source = await readFile("assets/brand/logo.png");
if (createHash("sha256").update(source).digest("hex") !== "89f74a8e8bd5536972b640b160c719d2cb92e5ae2814490580f85b75745a3b50") {
  throw Error("Approved brand original changed");
}
const latin = await readFile("node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf");
const layouts = {
  wide: { logo: 480, left: 100, top: 75, titleLeft: 594, titleTop: 229, titleSize: 76, spacing: -3, bodyLeft: 599, bodyTop: 334, bodySize: 34 },
  stacked: { logo: 410, left: 395, top: 25, titleLeft: 285, titleTop: 440, titleSize: 62, spacing: -2, bodyLeft: 285, bodyTop: 525, bodySize: 26 },
  "side-labels": { logo: 540, left: 330, top: 45, titleLeft: 118, titleTop: 280, titleSize: 37, spacing: -1, bodyLeft: 934, bodyTop: 278, bodySize: 26 },
  "compact-row": { logo: 400, left: 300, top: 115, titleLeft: 695, titleTop: 258, titleSize: 52, spacing: -2, bodyLeft: 697, bodyTop: 334, bodySize: 24 },
};

export async function renderCover(variant: (typeof coverVariants)[number], composition: CoverComposition) {
  const p = layouts[composition];
  const chinese = await readFile(`assets/brand/preview-fonts/noto-sans-${variant.font}-subset.ttf`);
  const centered = composition === "stacked";
  const sideLabels = composition === "side-labels";
  const image = new ImageResponse(createElement("div", {
    style: { display: "flex", width: "100%", height: "100%", backgroundColor: "#f4eee7", position: "relative", alignItems: "center", color: "#282522" },
  },
  createElement("img", { src: `data:image/png;base64,${source.toString("base64")}`, width: p.logo, height: p.logo, style: { position: "absolute", left: p.left, top: p.top } }),
  createElement("div", { style: { display: "flex", position: "absolute", left: p.titleLeft, top: p.titleTop, ...(centered ? { width: 630, justifyContent: "center" } : {}) } },
    createElement("div", { style: { display: "flex", fontFamily: "Brand", fontSize: p.titleSize, letterSpacing: p.spacing, lineHeight: 1.1, backgroundImage: "linear-gradient(100deg, #292524 0%, #7c4a36 60%, #a94b27 100%)", backgroundClip: "text", color: "transparent" } }, "IPinfo.dog")),
  createElement("div", { style: { display: "flex", position: "absolute", left: p.bodyLeft, top: p.bodyTop, ...(centered ? { width: 630 } : {}), flexDirection: sideLabels ? "column" : "row", justifyContent: centered ? "center" : "flex-start", fontFamily: "Brand, Localized", fontSize: p.bodySize, color: "#776e66", lineHeight: 1.3 } },
    ...(sideLabels ? variant.lines.map(line => createElement("div", { style: { display: "flex" } }, line)) : [variant.description]))), {
    width: 1200, height: 630,
    fonts: [{ name: "Brand", data: latin, weight: 400, style: "normal" }, { name: "Localized", data: chinese, weight: 500, style: "normal" }],
  });
  return sharp(Buffer.from(await image.arrayBuffer())).removeAlpha().png({ compressionLevel: 9, palette: false }).toBuffer();
}
