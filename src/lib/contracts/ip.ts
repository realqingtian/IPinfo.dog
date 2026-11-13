export type IpErrorCode =
  | "INVALID_IP"
  | "NON_PUBLIC_IP"
  | "NO_RECORD"
  | "DATA_UNAVAILABLE"
  | "TIMEOUT"
  | "RATE_LIMITED";

export type LocalizedName = Partial<Record<"zh-CN" | "zh-TW" | "en", string>>;
export type GeoCountry = { code: string | null; names: LocalizedName };

export type IpInformation = {
  address: string;
  family: "ipv4" | "ipv6";
  geolocatedCountry: GeoCountry | null;
  registeredCountry: GeoCountry | null;
  subdivisions: LocalizedName[];
  city: LocalizedName | null;
  accuracyRadiusKm: number | null;
  asn: number | null;
  organization: string | null;
  datasetId: string;
  queriedAt: string;
  sources: {
    edition: "GeoLite2-City" | "GeoLite2-Country" | "GeoLite2-ASN";
    buildTime: string;
  }[];
};

export type IpResponse =
  | { ok: true; data: IpInformation }
  | { ok: false; error: { code: IpErrorCode; retryable: boolean } };
