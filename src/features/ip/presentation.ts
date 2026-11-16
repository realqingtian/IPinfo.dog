import type { LocalizedName } from "../../lib/contracts/ip.ts";
import type { Locale } from "../../i18n/config.ts";
export function localizedName(names: LocalizedName | undefined | null, locale: Locale) { return names?.[locale] || names?.en || null; }
/** Keep IPv6 hextets and :: together when a narrow screen needs a line break. */
export function ipDisplayParts(address: string): string[] {
  const tokens = address.split(/(:{1,2})/);
  const parts: string[] = [];
  for (let index = 0; index < tokens.length; index += 2) parts.push(tokens[index] + (tokens[index + 1] ?? ""));
  return parts.filter(Boolean);
}
export function displayTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) + " UTC";
}
