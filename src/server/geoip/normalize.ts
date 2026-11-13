import type { AsnResponse, CityResponse, CountryResponse, Response } from "maxmind";
import type { ParsedIp } from "../../lib/ip.ts";
import type { GeoCountry, IpInformation, LocalizedName } from "../../lib/contracts/ip.ts";
import { editions, type Edition } from "./dataset.ts";
import { GeoIpError } from "./errors.ts";

export type QueryableDataset = {
  id: string;
  readers: Record<Edition, { buildTime: string; reader: { get(address: string): Response | null } }>;
};
export type LookupMaterial = Omit<IpInformation, "queriedAt">;

function names(value?: object): LocalizedName {
  const result: LocalizedName = {};
  if (value) for (const locale of ["zh-CN", "zh-TW", "en"] as const) {
    const text = (value as Record<string, unknown>)[locale];
    if (typeof text === "string" && text.trim()) result[locale] = text;
  }
  return result;
}

function country(value?: { iso_code?: string; names?: object }): GeoCountry | null {
  if (!value) return null;
  const code = typeof value.iso_code === "string" && /^[A-Z]{2}$/.test(value.iso_code) ? value.iso_code : null;
  const labels = names(value.names);
  return code || Object.keys(labels).length ? { code, names: labels } : null;
}

/** All reads use the same captured dataset; registered country never fills location. */
export function normalizeRecord(dataset: QueryableDataset, parsed: ParsedIp): LookupMaterial {
  const city = dataset.readers["GeoLite2-City"].reader.get(parsed.address) as CityResponse | null;
  const countryRecord = dataset.readers["GeoLite2-Country"].reader.get(parsed.address) as CountryResponse | null;
  const network = dataset.readers["GeoLite2-ASN"].reader.get(parsed.address) as AsnResponse | null;
  if (!city && !countryRecord && !network) throw new GeoIpError("NO_RECORD");

  const cityCountry = country(city?.country);
  const fallbackCountry = country(countryRecord?.country);
  const cityRegistered = country(city?.registered_country);
  const fallbackRegistered = country(countryRecord?.registered_country);
  const cityNames = names(city?.city?.names);
  const subdivisions = (city?.subdivisions ?? []).map((entry) => names(entry.names));
  const radius = city?.location?.accuracy_radius;
  const accuracyRadiusKm = typeof radius === "number" && Number.isFinite(radius) && radius >= 0 ? radius : null;
  const asn = Number.isInteger(network?.autonomous_system_number) && (network?.autonomous_system_number ?? 0) > 0
    ? network!.autonomous_system_number : null;
  const organization = typeof network?.autonomous_system_organization === "string" && network.autonomous_system_organization.trim()
    ? network.autonomous_system_organization : null;
  const conflicts: IpInformation["conflicts"] = [];
  for (const [field, primary, fallback] of [
    ["geolocatedCountry", cityCountry, fallbackCountry],
    ["registeredCountry", cityRegistered, fallbackRegistered],
  ] as const) {
    if (primary?.code && fallback?.code && primary.code !== fallback.code) {
      conflicts.push({ field, city: primary, country: fallback });
    }
  }
  return {
    address: parsed.address, family: parsed.family,
    geolocatedCountry: cityCountry ?? fallbackCountry,
    registeredCountry: cityRegistered ?? fallbackRegistered,
    subdivisions, city: Object.keys(cityNames).length ? cityNames : null,
    accuracyRadiusKm, asn, organization, datasetId: dataset.id, conflicts,
    fieldSources: {
      geolocatedCountry: cityCountry ? "GeoLite2-City" : fallbackCountry ? "GeoLite2-Country" : null,
      registeredCountry: cityRegistered ? "GeoLite2-City" : fallbackRegistered ? "GeoLite2-Country" : null,
      subdivisions: subdivisions.length ? "GeoLite2-City" : null,
      city: Object.keys(cityNames).length ? "GeoLite2-City" : null,
      accuracyRadiusKm: accuracyRadiusKm !== null ? "GeoLite2-City" : null,
      asn: asn !== null ? "GeoLite2-ASN" : null, organization: organization ? "GeoLite2-ASN" : null,
    },
    sources: editions.map((edition, index) => ({
      edition, buildTime: dataset.readers[edition].buildTime, found: [city, countryRecord, network][index] !== null,
    })),
  };
}
