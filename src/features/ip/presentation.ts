import type { GeoCountry, IpInformation, LocalizedName } from "../../lib/contracts/ip.ts";
import type { Locale } from "../../i18n/config.ts";
import { parseIp } from "../../lib/ip.ts";
export function localizedName(names: LocalizedName | undefined | null, locale: Locale) { return names?.[locale] || names?.en || null; }
export function localizedCountry(country: GeoCountry | null | undefined, locale: Locale) {
  if (country?.code) {
    try { return new Intl.DisplayNames([locale], { type: "region" }).of(country.code) || country.code; }
    catch { /* Fall back to the source name or ISO code. */ }
  }
  return localizedName(country?.names, locale) || country?.code || "—";
}
/** A fallback city must belong to the country already supplied by the source. */
export function supplementedCity(city: LocalizedName | null | undefined, country: GeoCountry | null | undefined, fallback: IpInformation | null | undefined) {
  if (city) return city;
  if (country && (!country.code || country.code !== fallback?.geolocatedCountry?.code)) return null;
  return fallback?.city ?? null;
}
/** Keep IPv6 hextets and :: together when a narrow screen needs a line break. */
export function ipDisplayParts(address: string): string[] {
  const tokens = address.split(/(:{1,2})/);
  const parts: string[] = [];
  for (let index = 0; index < tokens.length; index += 2) parts.push(tokens[index] + (tokens[index + 1] ?? ""));
  return parts.filter(Boolean);
}
/** Only display is masked. Clipboard, lookups and links retain the original IP. */
export function maskIpAddress(value: string): string {
  const { address, family } = parseIp(value);
  if (family === "ipv4") return address.split(".").slice(0, 2).join(".") + ".**.**";
  const [head, tail] = address.split("::"), left = head ? head.split(":") : [], right = tail ? tail.split(":") : [];
  const groups = tail !== undefined ? [...left, ...Array<string>(8 - left.length - right.length).fill("0"), ...right] : left;
  const visible = groups.slice(0, 4), masked = [...visible, "**", "**", "**", "**"];
  let bestStart = -1, bestLength = 1;
  for (let start = 0; start < visible.length;) {
    if (visible[start] !== "0") { start++; continue; }
    let end = start; while (visible[end] === "0") end++;
    if (end - start > bestLength) { bestStart = start; bestLength = end - start; } start = end;
  }
  return bestStart < 0 ? masked.join(":") : masked.slice(0, bestStart).join(":") + "::" + masked.slice(bestStart + bestLength).join(":");
}
export function displayTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) + " UTC";
}
