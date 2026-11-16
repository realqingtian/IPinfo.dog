import type { IpInformation } from "./contracts/ip.ts";
import type { SourceRecord } from "./contracts/ip-sources.ts";

/** Website hostname only; never turn organization text or an IP into a URL. */
export function normalizeProviderDomain(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const domain = value.trim().toLowerCase().replace(/\.$/, "");
  if (domain.length > 253 || !domain.includes(".")) return null;
  const labels = domain.split("."), tld = labels.at(-1)!;
  if (!labels.every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
    || !/^(?:[a-z]{2,63}|xn--[a-z0-9-]+)$/.test(tld)
    || ["local", "localhost", "internal", "test", "example", "invalid", "onion"].includes(tld)) return null;
  return domain;
}

export function providerDomainForResult(result: Pick<IpInformation, "address"> & Partial<Pick<IpInformation, "asn">>, record: SourceRecord | null) {
  return result.asn && record && record.address === result.address && record.asn === result.asn
    ? normalizeProviderDomain(record.domain) : null;
}

/** Browser image request only, no application proxy or query IP. */
export function providerIconUrl(value: unknown) {
  const domain = normalizeProviderDomain(value);
  return domain ? `https://icons.duckduckgo.com/ip3/${domain}.ico` : null;
}
