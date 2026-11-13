import type { IpInformation, LocalizedName } from "../../lib/contracts/ip.ts";
import { parseIp } from "../../lib/ip.ts";
import type { Locale } from "../../i18n/config.ts";

/** Documentation-only addresses, never actual visitor exits or MMDB results. */
export const demoAddresses = ["203.0.113.24", "2001:db8:1234:5678:abcd:ef01:2345:6789"] as const;

export function localizedName(names: LocalizedName | undefined | null, locale: Locale) {
  return names?.[locale] || names?.en || null;
}

export function demoRecord(family: "ipv4" | "ipv6"): IpInformation {
  const v4 = family === "ipv4";
  const names = v4 ? { "zh-CN": "中国香港（示例）", "zh-TW": "中國香港（範例）", en: "Hong Kong (example)" }
    : { "zh-CN": "新加坡（示例）", "zh-TW": "新加坡（範例）", en: "Singapore (example)" };
  return {
    address: demoAddresses[v4 ? 0 : 1], family,
    geolocatedCountry: { code: v4 ? "HK" : "SG", names },
    registeredCountry: { code: "SG", names: { "zh-CN": "新加坡（示例）", "zh-TW": "新加坡（範例）", en: "Singapore (example)" } },
    subdivisions: [], city: v4 ? names : null, accuracyRadiusKm: null,
    asn: v4 ? 64500 : 64501, organization: "Example Network",
    datasetId: "interface-demo", queriedAt: "2026-01-01T00:00:00Z", sources: [],
  };
}

export type PreviewState = { result: IpInformation; error: null }
  | { result: null; error: "invalidIp" | "nonPublicIp" | "previewOnly" | null };

export function previewState(input: string): PreviewState {
  if (!input.trim()) return { result: null, error: null };
  try {
    const parsed = parseIp(input);
    const index = demoAddresses.findIndex((address) => parseIp(address).address === parsed.address);
    if (index !== -1) return { result: demoRecord(index === 0 ? "ipv4" : "ipv6"), error: null };
    return { result: null, error: parsed.isPublic ? "previewOnly" : "nonPublicIp" };
  } catch { return { result: null, error: "invalidIp" }; }
}
