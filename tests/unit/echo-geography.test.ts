import { test } from "node:test";
import assert from "node:assert/strict";
import { readEchoGeography, needsEchoGeography, needsEchoLookup } from "../../src/features/ip/echo-geography.ts";
import { fetchIpipExit, fetchProtocolEcho } from "../../src/features/ip/protocol-probe.ts";

test("IPIP keeps its own country and city and skips local lookup for complete locations", async () => {
  const result = await fetchIpipExit(new AbortController().signal, async () => Response.json({ ret: "ok", data: { ip: "8.8.8.8", location: ["美国", "加州", "洛杉矶", "", "ISP"] } }));
  assert.ok(result.ok);
  assert.equal(result.data.location?.country?.code, "US");
  assert.equal(result.data.location?.city?.en, "洛杉矶");
  assert.equal(needsEchoGeography(result.data.location), false);
});
test("IPLeak uses location country instead of registration country and preserves missing fields", () => {
  const result = readEchoGeography({ country_code: "hk", country_name: "Hong Kong", city_name: "Kowloon", registered_country_code: "US" }, "json");
  assert.equal(result?.country?.code, "HK");
  assert.equal(result?.city?.en, "Kowloon");
  const partial = readEchoGeography({ country_code: "CN", country_name: "China", city_name: null }, "json");
  assert.equal(partial?.city, null);
  assert.equal(needsEchoGeography(partial), true);
  assert.equal(readEchoGeography({ ip: "8.8.8.8", city_name: {} }, "json"), undefined);
});
test("removed MyIP.la is never contacted", async () => {
  const urls: string[] = [];
  await fetchProtocolEcho("ipv4", new AbortController().signal, (async url => { urls.push(String(url)); return new Response("8.8.8.8"); }) as typeof fetch);
  assert.ok(urls.every(url => !url.includes("myip.la")));
});

test("native ASN avoids local lookup while a missing ASN requests supplementation", () => {
  const full = readEchoGeography({ country_code: "US", city_name: "Los Angeles", as_number: "AS212336" }, "json");
  assert.equal(full?.asn, 212336);
  assert.equal(needsEchoLookup(full), false);
  const partial = readEchoGeography({ country_code: "US", city_name: "Los Angeles" }, "json");
  assert.equal(needsEchoLookup(partial), true);
  assert.equal(readEchoGeography({ country_code: "US", as_number: 4294967296 }, "json")?.asn, null);
});

test("IPIP China name has an explicit CN mapping independent of browser CLDR names", () => {
  assert.equal(readEchoGeography({ location: ["中国", "广东", "广州"] }, "ipip")?.country?.code, "CN");
});

test("a source country is never paired with a fallback city from another country", async () => {
  const { supplementedCity } = await import("../../src/features/ip/presentation.ts");
  const { ipInformationFixture } = await import("../fixtures/ip.ts");
  const fallback = { ...ipInformationFixture(), geolocatedCountry: { code: "US", names: { en: "United States" } }, city: { en: "Los Angeles" } };
  assert.equal(supplementedCity(null, { code: "BR", names: { en: "Brazil" } }, fallback), null);
  assert.equal(supplementedCity(null, { code: "US", names: {} }, fallback)?.en, "Los Angeles");
  assert.equal(supplementedCity({ en: "Native city" }, { code: "BR", names: {} }, fallback)?.en, "Native city");
});
