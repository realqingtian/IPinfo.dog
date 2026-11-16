import type { GeoCountry, IpInformation, LocalizedName } from "./ip.ts";

export const extraSourceIds = ["dbip", "ipinfo"] as const;
export type ExtraSourceId = typeof extraSourceIds[number];
export type SourceId = "maxmind" | ExtraSourceId;
export const sourceLabels: Record<SourceId, string> = { maxmind: "MaxMind", dbip: "DB-IP Lite", ipinfo: "IPinfo Lite" };
export const sourceLinks: Record<SourceId, string> = { maxmind: "https://www.maxmind.com", dbip: "https://db-ip.com", ipinfo: "https://ipinfo.io/lite" };
export type SourceRecord = {
  address: string; source: SourceId; country: GeoCountry | null; city: LocalizedName | null;
  asn: number | null; organization: string | null; domain: string | null;
  queriedAt: string;
  dataDates: { kind: "city" | "country" | "asn"; date: string }[];
};
export const sourceErrorCodes = ["NOT_CONFIGURED", "UNAVAILABLE", "NO_RECORD", "TIMEOUT", "RATE_LIMITED"] as const;
export type SourceErrorCode = typeof sourceErrorCodes[number];
export type SourceOutcome = { ok: true; data: SourceRecord } | { ok: false; code: SourceErrorCode };

/** The three MaxMind editions remain one supplier; never duplicate them as votes. */
export function maxmindSource(info: IpInformation): SourceRecord {
  return { address: info.address, source: "maxmind", country: info.geolocatedCountry, city: info.city,
    asn: info.asn, organization: info.organization, domain: null, queriedAt: info.queriedAt,
    dataDates: info.sources.map(({ edition, buildTime }) => ({
      kind: edition === "GeoLite2-City" ? "city" : edition === "GeoLite2-Country" ? "country" : "asn", date: buildTime,
    })),
  };
}
