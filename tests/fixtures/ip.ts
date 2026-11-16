import type { IpInformation } from "../../src/lib/contracts/ip.ts";

/** Synthetic records for isolated tests; never imported by application code. */
export function ipInformationFixture(address = "1.1.1.1"): IpInformation {
  return {
    address, family: address.includes(":") ? "ipv6" : "ipv4",
    geolocatedCountry: { code: "HK", names: { en: "Hong Kong" } },
    registeredCountry: { code: "SG", names: { en: "Singapore" } },
    subdivisions: [], city: null, accuracyRadiusKm: null,
    asn: 64500, organization: "Test Network",
    datasetId: "unit-fixture", queriedAt: "2026-01-01T00:00:00Z",
    sources: (["GeoLite2-City", "GeoLite2-Country", "GeoLite2-ASN"] as const).map((edition) => ({
      edition, buildTime: "2026-01-01T00:00:00Z", found: true,
    })),
    fieldSources: { geolocatedCountry: "GeoLite2-City", registeredCountry: "GeoLite2-City",
      subdivisions: null, city: null, accuracyRadiusKm: null,
      asn: "GeoLite2-ASN", organization: "GeoLite2-ASN" },
    conflicts: [],
  };
}
