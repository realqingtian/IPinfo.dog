import { editions } from "../../src/server/geoip/dataset.ts";
/** Only this three-edition official configuration can confirm the complete set. */
export function validateUpdateConfiguration(text: string) {
  const values = new Map<string, string[]>();
  for (const line of text.split(/\r?\n/)) {
    const parts = line.split("#")[0].trim().split(/\s+/);
    if (!parts[0]) continue;
    const name = parts.shift()!;
    if (!["AccountID", "LicenseKey", "EditionIDs"].includes(name) || values.has(name)) throw new Error("INVALID_UPDATE_CONFIGURATION");
    values.set(name, parts);
  }
  if (!/^[1-9]\d*$/.test((values.get("AccountID") ?? []).join(" ")) || values.get("LicenseKey")?.length !== 1
    || values.get("EditionIDs")?.length !== editions.length || editions.some(e => !values.get("EditionIDs")?.includes(e))) throw new Error("INVALID_UPDATE_CONFIGURATION");
}
