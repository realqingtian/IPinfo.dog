import type { LocalizedName } from "../../lib/contracts/ip.ts";
import type { Locale } from "../../i18n/config.ts";
export function localizedName(names: LocalizedName | undefined | null, locale: Locale) { return names?.[locale] || names?.en || null; }
export function displayTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) + " UTC";
}
