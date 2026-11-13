import { test } from "node:test";
import assert from "node:assert/strict";
import type { CityResponse, Response as MmdbResponse } from "maxmind";
import type { Edition } from "../../src/server/geoip/dataset.ts";
import { parseIp } from "../../src/lib/ip.ts";
import { normalizeRecord } from "../../src/server/geoip/normalize.ts";
import { createDatasetProvider } from "../../src/server/geoip/provider.ts";
import { createLookupService } from "../../src/server/geoip/service.ts";
import { GeoIpError } from "../../src/server/geoip/errors.ts";
import { createIpHandler, createRequestBudget } from "../../src/server/http/ip-handler.ts";

const country = (code: string) => ({ iso_code: code, geoname_id: 1, names: { en: code, "zh-CN": `${code} fixture` } });
const city: CityResponse = {
  country: country("HK"), registered_country: country("SG"),
  city: { geoname_id: 2, names: { en: "Example City" } },
  subdivisions: [{ geoname_id: 3, iso_code: "X", names: { en: "Example Region" } }],
};
const asn = { autonomous_system_number: 64500, autonomous_system_organization: "Example Network" };
function dataset(records: Partial<Record<Edition, MmdbResponse | null>> = {
  "GeoLite2-City": city, "GeoLite2-Country": { country: country("HK") }, "GeoLite2-ASN": asn,
}, id = "fixture-v1") {
  let calls = 0;
  const readerFor = (edition: Edition) => ({
    buildTime: "2026-11-01T00:00:00.000Z",
    reader: { get: () => { calls++; return records[edition] ?? null; } },
  });
  const readers = { "GeoLite2-City": readerFor("GeoLite2-City"),
    "GeoLite2-Country": readerFor("GeoLite2-Country"), "GeoLite2-ASN": readerFor("GeoLite2-ASN") };
  return { value: { id, readers }, calls: () => calls };
}
const rejectsCode = async (promise: Promise<unknown>, code: string) => {
  await assert.rejects(promise, (error: unknown) => error instanceof GeoIpError && error.code === code);
};

test("normalizer preserves field sources, known missing fields, and separate registration", () => {
  const result = normalizeRecord(dataset().value, parseIp("1.1.1.1"));
  assert.equal(result.geolocatedCountry?.code, "HK");
  assert.equal(result.registeredCountry?.code, "SG");
  assert.equal(result.city?.en, "Example City");
  assert.equal(result.subdivisions[0].en, "Example Region");
  assert.equal(result.accuracyRadiusKm, null);
  assert.equal(result.fieldSources.accuracyRadiusKm, null);
  assert.equal(result.fieldSources.city, "GeoLite2-City");
  assert.equal(result.fieldSources.asn, "GeoLite2-ASN");
  assert.equal(result.sources.length, 3);
  assert.equal(result.conflicts.length, 0);
  assert.equal(result.city?.["zh-TW"], undefined);
});
test("Country fallback is attributed without synthesizing City or using registration", () => {
  const data = dataset({ "GeoLite2-City": { registered_country: country("SG") },
    "GeoLite2-Country": { country: country("TW") } });
  const result = normalizeRecord(data.value, parseIp("1.1.1.1"));
  assert.equal(result.geolocatedCountry?.code, "TW");
  assert.equal(result.fieldSources.geolocatedCountry, "GeoLite2-Country");
  assert.equal(result.city, null);
  assert.equal(result.asn, null);
  const registrationOnly = normalizeRecord(dataset({ "GeoLite2-Country": { registered_country: country("SG") } }).value, parseIp("1.1.1.1"));
  assert.equal(registrationOnly.geolocatedCountry, null);
  assert.equal(registrationOnly.fieldSources.geolocatedCountry, null);
  assert.equal(registrationOnly.registeredCountry?.code, "SG");
});
test("City and Country conflicts are exposed; City remains the selected source", () => {
  const data = dataset({ "GeoLite2-City": city,
    "GeoLite2-Country": { country: country("TW"), registered_country: country("US") } });
  const result = normalizeRecord(data.value, parseIp("1.1.1.1"));
  assert.equal(result.geolocatedCountry?.code, "HK");
  assert.deepEqual(result.conflicts.map((item) => item.field), ["geolocatedCountry", "registeredCountry"]);
  assert.equal(result.conflicts[0].country.code, "TW");
  assert.equal(result.conflicts[1].city.code, "SG");
});
test("network-only and empty records succeed with nulls; all-null records report NO_RECORD", () => {
  const onlyNetwork = normalizeRecord(dataset({ "GeoLite2-ASN": asn }).value, parseIp("1.1.1.1"));
  assert.equal(onlyNetwork.geolocatedCountry, null);
  assert.equal(onlyNetwork.asn, 64500);
  assert.deepEqual(onlyNetwork.sources.map((source) => source.found), [false, false, true]);
  assert.equal(normalizeRecord(dataset({ "GeoLite2-City": {} }).value, parseIp("1.1.1.1")).city, null);
  assert.throws(() => normalizeRecord(dataset({}).value, parseIp("1.1.1.1")), (error) => error instanceof GeoIpError && error.code === "NO_RECORD");
});
test("zero radius is preserved and malformed optional facts are not invented", () => {
  const withZero = { location: { accuracy_radius: 0 } } as CityResponse;
  assert.equal(normalizeRecord(dataset({ "GeoLite2-City": withZero }).value, parseIp("1.1.1.1")).accuracyRadiusKm, 0);
  const malformed = { location: { accuracy_radius: -1 }, country: { iso_code: "bad", names: {} } } as unknown as CityResponse;
  const result = normalizeRecord(dataset({ "GeoLite2-City": malformed }).value, parseIp("1.1.1.1"));
  assert.equal(result.accuracyRadiusKm, null);
  assert.equal(result.geolocatedCountry, null);
});

test("validation runs before database loading and mapped public IP shares the canonical cache", async () => {
  const data = dataset(); let loads = 0;
  const service = createLookupService({ getDataset: async () => { loads++; return data.value; } });
  await rejectsCode(service.lookup("example.com"), "INVALID_IP");
  await rejectsCode(service.lookup("::ffff:127.0.0.1"), "NON_PUBLIC_IP");
  assert.equal(loads, 0);
  assert.equal((await service.lookup("::ffff:1.1.1.1")).family, "ipv4");
  await service.lookup(" 1.1.1.1 ");
  assert.equal(data.calls(), 3);
});
test("cache has TTL, fresh request timestamps, and caller mutation isolation", async () => {
  const data = dataset(); let time = 1_000;
  const service = createLookupService({ getDataset: async () => data.value, now: () => time, ttlMs: 100 });
  const first = await service.lookup("1.1.1.1");
  first.city!.en = "corrupted by caller";
  time += 50;
  const second = await service.lookup("1.1.1.1");
  assert.equal(second.city?.en, "Example City");
  assert.notEqual(first.queriedAt, second.queriedAt);
  assert.equal(data.calls(), 3);
  time += 50;
  await service.lookup("1.1.1.1");
  assert.equal(data.calls(), 6);
});
test("cache capacity evicts least recently used targets", async () => {
  const data = dataset();
  const service = createLookupService({ getDataset: async () => data.value, maxEntries: 2 });
  await service.lookup("1.1.1.1"); await service.lookup("8.8.8.8");
  await service.lookup("1.1.1.1"); await service.lookup("9.9.9.9");
  await service.lookup("1.1.1.1"); assert.equal(data.calls(), 9);
  await service.lookup("8.8.8.8"); assert.equal(data.calls(), 12);
});
test("captured dataset and cache are isolated by complete dataset identity", async () => {
  const first = dataset(); const second = dataset({ "GeoLite2-Country": { country: country("US") } }, "fixture-v2");
  let active = first.value;
  const service = createLookupService({ getDataset: async () => active });
  assert.equal((await service.lookup("1.1.1.1")).geolocatedCountry?.code, "HK");
  active = second.value;
  const result = await service.lookup("1.1.1.1");
  assert.equal(result.datasetId, "fixture-v2");
  assert.equal(result.geolocatedCountry?.code, "US");
  assert.equal(first.calls(), 3); assert.equal(second.calls(), 3);
});
test("loading timeout and reader exceptions are distinct and do not leak paths", async () => {
  const slow = createLookupService({ getDataset: () => new Promise(() => {}), timeoutMs: 5 });
  await rejectsCode(slow.lookup("1.1.1.1"), "TIMEOUT");
  const data = dataset(); data.value.readers["GeoLite2-City"].reader.get = () => { throw new Error("private disk failure"); };
  const broken = createLookupService({ getDataset: async () => data.value });
  await rejectsCode(broken.lookup("1.1.1.1"), "DATA_UNAVAILABLE");
});
test("provider shares in-flight load, then reuses the complete snapshot", async () => {
  let loads = 0;
  const value = dataset().value;
  const provider = createDatasetProvider({ directory: () => "fixture", load: async () => { loads++; return value; } });
  const [a, b] = await Promise.all([provider.get(), provider.get()]);
  assert.equal(a, value); assert.equal(b, value); await provider.get(); assert.equal(loads, 1);
});
test("provider missing configuration and failed load backoff recover without disclosing exceptions", async () => {
  await rejectsCode(createDatasetProvider({ directory: () => undefined }).get(), "DATA_UNAVAILABLE");
  let time = 0; let loads = 0;
  const provider = createDatasetProvider({ directory: () => "fixture", now: () => time, cooldownMs: 100,
    load: async () => { if (++loads === 1) throw new Error("sensitive path"); return dataset().value; } });
  await rejectsCode(provider.get(), "DATA_UNAVAILABLE"); await rejectsCode(provider.get(), "DATA_UNAVAILABLE");
  assert.equal(loads, 1); time = 100; await provider.get(); assert.equal(loads, 2);
});

test("HTTP accepts exactly one ip parameter and does not silently extract other input", async () => {
  const service = createLookupService({ getDataset: async () => dataset().value });
  const handle = createIpHandler({ lookup: service.lookup });
  for (const query of ["", "ip=", "ip=1.1.1.1&ip=8.8.8.8", "ip=1.1.1.1&locale=en", "ip=https%3A%2F%2F1.1.1.1", `ip=${"a".repeat(2100)}`]) {
    const response = await handle(new Request(`http://localhost/api/ip?${query}`));
    assert.equal(response.status, 400); assert.equal((await response.json()).error.code, "INVALID_IP");
  }
});
test("HTTP returns public facts with no-store, no CORS grants, and no locale dependence", async () => {
  const service = createLookupService({ getDataset: async () => dataset().value });
  const handle = createIpHandler({ lookup: service.lookup });
  const response = await handle(new Request("http://localhost/api/ip?ip=1.1.1.1", {
    headers: { "Accept-Language": "zh-TW", "X-Forwarded-For": "8.8.8.8", Origin: "https://other.example" },
  }));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("Cache-Control")!, /no-store/);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
  assert.equal(response.headers.get("Cross-Origin-Resource-Policy"), "same-origin");
  assert.equal((await response.json()).data.address, "1.1.1.1");
});
test("HTTP errors map every category to stable status and retryability, without raw diagnostics", async () => {
  for (const [code, status, retryable] of [
    ["INVALID_IP", 400, false], ["NON_PUBLIC_IP", 422, false], ["NO_RECORD", 404, false],
    ["DATA_UNAVAILABLE", 503, true], ["TIMEOUT", 504, true],
  ] as const) {
    const handle = createIpHandler({ lookup: async () => { throw new GeoIpError(code, code === "NON_PUBLIC_IP" ? "loopback" : undefined); } });
    const response = await handle(new Request("http://localhost/api/ip?ip=1.1.1.1"));
    assert.equal(response.status, status); const body = await response.json();
    assert.equal(body.error.code, code); assert.equal(body.error.retryable, retryable);
    assert.equal(body.error.scope, code === "NON_PUBLIC_IP" ? "loopback" : undefined);
  }
  const handle = createIpHandler({ lookup: async () => { throw new Error("sensitive diagnostics"); } });
  assert.deepEqual(await (await handle(new Request("http://localhost/api/ip?ip=1.1.1.1"))).json(),
    { ok: false, error: { code: "DATA_UNAVAILABLE", retryable: true } });
});
test("bounded process request budget returns 429 and Retry-After, then resets", async () => {
  let time = 0;
  const budget = createRequestBudget({ now: () => time, limit: 2, windowMs: 2_000 });
  const service = createLookupService({ getDataset: async () => dataset().value });
  const handle = createIpHandler({ lookup: service.lookup, budget });
  const request = () => new Request("http://localhost/api/ip?ip=1.1.1.1");
  assert.equal((await handle(request())).status, 200); assert.equal((await handle(request())).status, 200);
  const limited = await handle(request()); assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("Retry-After"), "2");
  assert.equal((await limited.json()).error.code, "RATE_LIMITED");
  time = 2_000; assert.equal((await handle(request())).status, 200);
});
