export const locales = ["zh-CN", "zh-TW", "en"] as const;
export type Locale = (typeof locales)[number];
export const localeCookie = "IPINFO_LOCALE";
export const localeNames: Record<Locale, string> = {
  "zh-CN": "简体中文", "zh-TW": "繁體中文", en: "English",
};

export function isLocale(value: unknown): value is Locale {
  return locales.includes(value as Locale);
}

function matchLanguage(tag: string): Locale | undefined {
  const parts = tag.toLowerCase().split("-");
  if (parts[0] === "en") return "en";
  if (parts[0] !== "zh") return undefined;
  if (parts.includes("hant")) return "zh-TW";
  if (parts.includes("hans")) return "zh-CN";
  return parts.some((part) => ["tw", "hk", "mo"].includes(part)) ? "zh-TW" : "zh-CN";
}

export function chooseLocale(saved: unknown, acceptLanguage = ""): Locale {
  if (isLocale(saved)) return saved;
  const candidates = acceptLanguage.slice(0, 4096).split(",").map((entry, order) => {
    const [tag, ...parameters] = entry.trim().split(";");
    const quality = parameters.find((parameter) => parameter.trim().startsWith("q="));
    const q = quality ? Number(quality.trim().slice(2)) : 1;
    return { locale: matchLanguage(tag), q, order };
  }).filter((item) => item.locale && Number.isFinite(item.q) && item.q > 0 && item.q <= 1)
    .sort((a, b) => b.q - a.q || a.order - b.order);
  return candidates[0]?.locale ?? "en";
}
