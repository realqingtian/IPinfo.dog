import { writeFile } from "node:fs/promises";
import { coverVariants, renderCover } from "./cover-renderer.ts";

// Preview output never writes public assets or page metadata.
const composition = process.argv.includes("--compact") ? "compact-row" : process.argv.includes("--safe") ? "stacked" : process.argv.includes("--pure-square") ? "side-labels" : "wide";
const prefix = composition === "compact-row" ? "compatible-banner" : composition === "stacked" ? "safe-banner" : composition === "side-labels" ? "pure-square-banner" : "light-banner";
for (const variant of coverVariants) {
  const png = await renderCover(variant, composition);
  const path = `docs/archive/m2/m2-ux-02-mobile-icons/${prefix}-${variant.locale.toLowerCase()}.png`;
  await writeFile(path, png);
  console.log(`${variant.locale}: ${variant.description} → ${path}`);
}
