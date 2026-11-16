import type { GeoCountry, IpInformation, LocalizedName } from "./ip.ts";

export const onlineSourceIds = ["ipquery", "freeipapi", "ipdata", "iplocation", "ip125"] as const;
export type OnlineSourceId = typeof onlineSourceIds[number];
export const extraSourceIds = ["ipinfo", ...onlineSourceIds] as const;
export type ExtraSourceId = typeof extraSourceIds[number];
export type SourceId = "maxmind" | ExtraSourceId;
export const sourceLabels: Record<SourceId, string> = { maxmind: "MaxMind", ipinfo: "IPinfo Lite", freeipapi: "FreeIPAPI", ipquery: "IPQuery", ipdata: "ipdata GeoIP", iplocation: "IPLocation.net", ip125: "IP125" };
export const sourceLinks: Record<SourceId, string> = { maxmind: "https://www.maxmind.com", ipinfo: "https://ipinfo.io/developers/ipinfo-lite-database", freeipapi: "https://freeipapi.com/", ipquery: "https://ipquery.io/developers/api", ipdata: "https://ipdata.co", iplocation: "https://api.iplocation.net/docs/v2", ip125: "https://ip125.com/api-docs/" };
export type SourceRecord = {
  address: string; source: SourceId; country: GeoCountry | null; city: LocalizedName | null;
  asn: number | null; organization: string | null; domain: string | null;
  queriedAt: string; updateWarning?: boolean;
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
