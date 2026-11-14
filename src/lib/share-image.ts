import type { Locale } from "@/i18n/config";

export function shareImageForLocale(locale: Locale) {
  return `https://ipinfo.dog/brand/share-cover-v5-${locale.toLowerCase()}.png`;
}
