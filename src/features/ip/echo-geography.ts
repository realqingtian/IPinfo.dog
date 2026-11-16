import countries from "flag-icons/country.json" with { type: "json" };
import type { GeoCountry, LocalizedName } from "../../lib/contracts/ip.ts";

export type EchoGeography = { country: GeoCountry | null; city: LocalizedName | null; asn: number | null };
const supported = new Set(countries.filter(country => country.iso).map(country => country.code.toUpperCase()));
let countryNames: Map<string, string> | undefined;
function countryCode(name: string) {
  if (!countryNames) {
    countryNames = new Map([["中国", "CN"], ["中华人民共和国", "CN"], ["中国大陆", "CN"], ["中国内地", "CN"], ["香港", "HK"], ["澳门", "MO"], ["台湾", "TW"]]);
    for (const locale of ["zh-CN", "en"]) {
      const names = new Intl.DisplayNames([locale], { type: "region" });
      for (const code of supported) countryNames.set(names.of(code) || code, code);
    }
  }
  return countryNames.get(name) || null;
}
function text(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 128 && !/[\u0000-\u001f]/.test(value) ? value.trim() : null;
}
/** Only documented location fields from the already-validated IP response are read. */
export function readEchoGeography(body: unknown, format: "json" | "ipip"): EchoGeography | undefined {
  if (!body || typeof body !== "object") return;
  const data = body as Record<string, unknown>;
  const parts = format === "ipip" && Array.isArray(data.location) ? data.location : [];
  const name = text(format === "ipip" ? parts[0] : data.country_name);
  const city = text(format === "ipip" ? parts[2] : data.city_name);
  const rawCode = text(data.country_code)?.toUpperCase();
  const code = rawCode && supported.has(rawCode) ? rawCode : name ? countryCode(name) : null;
  const rawAsn = data.as_number;
  const asn = typeof rawAsn === "number" ? rawAsn : typeof rawAsn === "string" && /^(?:AS)?[1-9]\d*$/.test(rawAsn) ? Number(rawAsn.replace(/^AS/, "")) : null;
  const validAsn = asn && Number.isInteger(asn) && asn > 0 && asn <= 4_294_967_295 ? asn : null;
  if (!name && !code && !city && !validAsn) return;
  return { country: name || code ? { code, names: name ? { en: name } : {} } : null, city: city ? { en: city } : null, asn: validAsn };
}
export function needsEchoGeography(location?: EchoGeography) {
  return !location?.country || !location.city;
}

export function needsEchoLookup(location?: EchoGeography) {
  return needsEchoGeography(location) || !location?.asn;
}
