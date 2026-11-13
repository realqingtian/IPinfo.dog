import assert from "node:assert/strict";
import type { CityResponse, CountryResponse, AsnResponse } from "maxmind";
import { loadDataset, queryDataset, editions } from "../src/server/geoip/dataset.ts";
import { createLookupService } from "../src/server/geoip/service.ts";
import { createIpHandler } from "../src/server/http/ip-handler.ts";

const directory = process.env.GEOIP_DATABASE_DIR;
if (!directory) throw new Error("Set GEOIP_DATABASE_DIR to three legitimately obtained MMDB files");
const dataset = await loadDataset(directory);
const service = createLookupService({ getDataset: async () => dataset });
const handle = createIpHandler({ lookup: service.lookup });
const addresses = ["1.1.1.1", "8.8.8.8", "9.9.9.9", "208.67.222.222",
  "2606:4700:4700::1111", "2001:4860:4860::8888"];
const results = [];
for (const address of addresses) {
  const city = queryDataset(dataset, "GeoLite2-City", address) as CityResponse | null;
  const country = queryDataset(dataset, "GeoLite2-Country", address) as CountryResponse | null;
  const asn = queryDataset(dataset, "GeoLite2-ASN", address) as AsnResponse | null;
  assert.ok(city || country || asn);
  const response = await handle(new Request(`http://localhost/api/ip?ip=${encodeURIComponent(address)}`));
  assert.equal(response.status, 200);
  const body = await response.json();
  const result = body.data;
  assert.equal(result.geolocatedCountry?.code ?? null, city?.country?.iso_code ?? country?.country?.iso_code ?? null);
  assert.equal(result.registeredCountry?.code ?? null, city?.registered_country?.iso_code ?? country?.registered_country?.iso_code ?? null);
  assert.equal(result.city?.en ?? null, city?.city?.names?.en ?? null);
  assert.equal(result.asn, asn?.autonomous_system_number ?? null);
  assert.equal(result.organization, asn?.autonomous_system_organization ?? null);
  assert.equal(result.fieldSources.geolocatedCountry, city?.country ? "GeoLite2-City" : country?.country ? "GeoLite2-Country" : null);
  assert.equal(result.datasetId, dataset.id);
  assert.equal(result.sources.length, 3);
  results.push({ address, status: response.status, data: result });
}
const mapped = await service.lookup("::ffff:8.8.8.8");
assert.equal(mapped.address, "8.8.8.8"); assert.equal(mapped.family, "ipv4");
console.log(JSON.stringify({ runtime: process.version, passed: true, publicQueries: results.length,
  mappedIPv6Verified: true, datasetId: dataset.id,
  databases: editions.map((edition) => ({ edition, sha256: dataset.readers[edition].sha256,
    buildTime: dataset.readers[edition].buildTime })), results }, null, 2));
