import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeProviderDomain, providerDomainForResult, providerIconUrl } from "../../src/lib/provider-domain.ts";
import type { SourceRecord } from "../../src/lib/contracts/ip-sources.ts";

const record: SourceRecord = { address: "8.8.8.8", source: "ipinfo", country: null, city: null, asn: 15169, organization: "Google LLC", domain: "google.com", dataDates: [], queriedAt: "2026-11-16T00:00:00Z" };

test("provider icon requires an exact target and matching ASN, never guesses from a name", () => {
  const target = { address: "8.8.8.8", asn: 15169 };
  assert.equal(providerDomainForResult(target, record), "google.com");
  for (const other of [null, { ...record, address: "1.1.1.1" }, { ...record, asn: 13335 }, { ...record, domain: null }]) assert.equal(providerDomainForResult(target, other), null);
  assert.equal(providerDomainForResult({ address: target.address }, record), null);
});
test("domain normalization refuses URLs, ports, private / numeric targets and path injection", () => {
  assert.equal(normalizeProviderDomain(" BYTEVIRT.COM. "), "bytevirt.com");
  assert.equal(normalizeProviderDomain("xn--bcher-kva.de"), "xn--bcher-kva.de");
  for (const bad of [null, "", "localhost", "127.0.0.1", "[::1]", "https://google.com", "x.com:443", "u@x.com", "a.local", "a.internal", "a.invalid", "a.test", "a.example", "a.onion", "x.com/../", "x.com?ip=8.8.8.8", "x.com#x", "a%2fb.com", "-x.com", "x..com", "x.123", "x".repeat(64)+".com"]) assert.equal(normalizeProviderDomain(bad), null, String(bad));
});
test("provider icon URL stays on fixed browser image host without query targets", () => {
  assert.equal(providerIconUrl("BYTEVIRT.COM"), "https://icons.duckduckgo.com/ip3/bytevirt.com.ico");
  for (const value of ["https://127.0.0.1", "google.com?ip=8.8.8.8", "a.local"]) assert.equal(providerIconUrl(value), null);
});
