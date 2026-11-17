import { test } from "node:test";
import assert from "node:assert/strict";
import { onlineSourceIds } from "../../src/lib/contracts/ip-sources.ts";
import { createBrowserSourceClient, normalizePublicSource, publicSourceUrl } from "../../src/features/ip/source-client.ts";

const address = "8.8.8.8", time = "2026-11-16T00:00:00.000Z";
const urls = {
  mir6: "https://api.mir6.com/api/ip_json?ip=8.8.8.8",
  ipleak: "https://ipleak.net/json/8.8.8.8",
  ipinfoOnline: "https://ipinfo.io/8.8.8.8/json",
  ipdata: "https://ipdata.free/8.8.8.8",
  iplocation: "https://api.iplocation.net/v2/ip-country",
  freeipapi: "https://free.freeipapi.com/api/v1/json/8.8.8.8",
  ipquery: "https://api.ipquery.io/8.8.8.8?format=json",
};
const bodies = {
  mir6: { code: 200, data: { ip: address, countryCode: "US", country: "United States", city: "Mountain View", idc: "Google LLC", myip: "1.1.1.1" } },
  ipleak: { ip: address, country_code: "US", country_name: "United States", city_name: "Mountain View", as_number: 15169, isp_name: "Google LLC" },
  ipinfoOnline: { ip: address, country: "US", city: "Mountain View", org: "AS15169 Google LLC" },
  ipdata: { ip: address, country: "US", asn: "AS15169", org: "Google LLC", city: "Mountain View" },
  iplocation: { ip: address, country_code2: "US", country_name: "United States of America", isp: "Google LLC", response_code: "200" },
  freeipapi: { ipAddress: address, countryCode: "US", countryName: "United States", cityName: "Mountain View", asn: "15169", asnOrganization: "Google LLC", is_proxy: false },
  ipquery: { ip: address, location: { country_code: "US", country: "United States", city: "Mountain View" }, isp: { asn: "AS15169", org: "Google LLC" }, risk: { risk_score: 0 } },
};
for (const source of onlineSourceIds) {
  test(`${source} goes directly to vendor using credential-free CORS, never the application API`, async () => {
    let calls = 0;
    const client = createBrowserSourceClient({ transport: (async (url, init) => {
      calls++; assert.equal(String(url), urls[source]);
      if (source === "iplocation") { assert.equal(init?.method, "POST"); assert.equal(String(init?.body), "ip=8.8.8.8"); }
      assert.equal(init?.mode, "cors"); assert.equal(init?.credentials, "omit"); assert.equal(init?.redirect, "error"); assert.equal(init?.referrerPolicy, "no-referrer");
      assert.deepEqual(init?.headers, { Accept: "application/json" });
      return Response.json(bodies[source]);
    }) as typeof fetch });
    const result = await client(source, "::ffff:8.8.8.8", new AbortController().signal);
    assert.ok(result.ok); assert.equal(result.data.source, source); assert.equal(result.data.country?.code, "US");
    assert.equal(result.data.asn, source === "iplocation" || source === "mir6" ? null : 15169);
    assert.equal(result.data.city?.en, source === "iplocation" ? undefined : "Mountain View");
    assert.equal(calls, 1); assert.ok(!("risk" in result.data));
  });
  test(`${source} rejects private or arbitrary URL input before any network request`, async () => {
    let calls = 0; const client = createBrowserSourceClient({ transport: (async () => { calls++; throw Error(); }) as typeof fetch });
    for (const target of ["127.0.0.1", "::1", "2001:db8::1", "https://evil.example", "8.8.8.8/24"]) assert.deepEqual(await client(source, target, new AbortController().signal), { ok: false, code: "UNAVAILABLE" });
    assert.equal(calls, 0);
  });
  test(`${source} rejects identity mismatches, HTML and oversized bodies without leaking content`, async () => {
    for (const response of [Response.json(source === "mir6" ? { code: 200, data: { ...bodies.mir6.data, ip: "1.1.1.1" } } : { ...bodies[source], query: "1.1.1.1", ip: "1.1.1.1", ipAddress: "1.1.1.1" }), new Response("secret-html"), new Response("x".repeat(65_537)), new Response("secret", { headers: { "Content-Length": "999999" } })]) {
      assert.deepEqual(await createBrowserSourceClient({ transport: (async () => response) as typeof fetch })(source, address, new AbortController().signal), { ok: false, code: "UNAVAILABLE" });
    }
  });
  test(`${source} preserves distinct errors and never retries a CORS failure through a server`, async () => {
    for (const [status, code] of [[429, "RATE_LIMITED"], [404, "NO_RECORD"], [302, "UNAVAILABLE"], [500, "UNAVAILABLE"]] as const) {
      assert.deepEqual(await createBrowserSourceClient({ transport: (async () => new Response("secret", { status })) as typeof fetch })(source, address, new AbortController().signal), { ok: false, code });
    }
    let calls = 0;
    const result = await createBrowserSourceClient({ transport: (async () => { calls++; throw new TypeError("CORS secret"); }) as typeof fetch })(source, address, new AbortController().signal);
    assert.deepEqual(result, { ok: false, code: "UNAVAILABLE" }); assert.equal(calls, 1);
  });
  test(`${source} deadlines cover slow headers and bodies and external cancellation returns promptly`, async () => {
    let signal: AbortSignal | null | undefined;
    const transport = ((_url, init) => { signal = init?.signal; return new Promise(() => {}); }) as typeof fetch;
    assert.deepEqual(await createBrowserSourceClient({ timeoutMs: 10, transport })(source, address, new AbortController().signal), { ok: false, code: "TIMEOUT" }); assert.ok(signal?.aborted);
    const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new TextEncoder().encode('{"ip":')); } });
    assert.deepEqual(await createBrowserSourceClient({ timeoutMs: 10, transport: (async () => new Response(stream)) as typeof fetch })(source, address, new AbortController().signal), { ok: false, code: "TIMEOUT" });
    const abort = new AbortController(), pending = createBrowserSourceClient({ transport })(source, address, abort.signal); abort.abort();
    assert.deepEqual(await pending, { ok: false, code: "UNAVAILABLE" });
  });
}
test("sparse IPv6 records preserve missing and malformed fields", () => {
  const ip = "2001:4860:4860::8888";
  const sparse = normalizePublicSource("ipquery", { ip, location: { country_code: "US", city: "bad\ncity" }, isp: { asn: "AS4294967296", org: "x".repeat(257) } }, ip, time);
  assert.equal(sparse.city, null); assert.equal(sparse.asn, null); assert.equal(sparse.organization, null);
});
test("online records never infer provider domains from organization names", () => {
  assert.equal(normalizePublicSource("freeipapi", bodies.freeipapi, address, time).domain, null);
});
test("browser cache isolates suppliers, copies cached data, expires and does not store cancelled work", async () => {
  let clock = 0, calls = 0;
  const client = createBrowserSourceClient({ now: () => clock, transport: (async url => { calls++; return Response.json(String(url).includes("freeipapi") ? bodies.freeipapi : bodies.ipquery); }) as typeof fetch });
  const first = await client("ipquery", address, new AbortController().signal); assert.ok(first.ok); first.data.organization = "changed";
  const second = await client("ipquery", address, new AbortController().signal); assert.ok(second.ok); assert.equal(second.data.organization, "Google LLC"); assert.equal(calls, 1);
  await client("freeipapi", address, new AbortController().signal); assert.equal(calls, 2);
  clock = 300_001; await client("ipquery", address, new AbortController().signal); assert.equal(calls, 3);
  const abort = new AbortController(); abort.abort(); await client("freeipapi", address, abort.signal); assert.equal(calls, 3);
});
test("default vendor client cannot run as an SSR or server-side fallback", async () => {
  assert.equal(typeof window, "undefined");
  assert.deepEqual(await createBrowserSourceClient()("freeipapi", address, new AbortController().signal), { ok: false, code: "UNAVAILABLE" });
  assert.throws(() => publicSourceUrl("unknown" as never, address));
});


test("MIR6 validates the target rather than myip and does not turn anycast into a country", () => {
  const ip = "2001:4860:4860::8888";
  const row = normalizePublicSource("mir6", { code: 200, data: { ip, myip: "1.1.1.1", country: "全球任播地址", countryCode: "", city: "", idc: "Google LLC" } }, ip, time);
  assert.equal(row.address, ip); assert.equal(row.country, null); assert.equal(row.city, null); assert.equal(row.organization, "Google LLC");
  const empty = normalizePublicSource("mir6", { code: 200, data: { ip, country: "全球任播地址", countryCode: "", city: "", idc: "未知" } }, ip, time);
  assert.equal(empty.address, ip); assert.equal(empty.country, null); assert.equal(empty.city, null); assert.equal(empty.organization, null);
  for (const [code, expected] of [[201, "NO_RECORD"], [202, "RATE_LIMITED"], [500, "UNAVAILABLE"]] as const) assert.throws(() => normalizePublicSource("mir6", { code }, address, time), { code: expected });
});
test("MIR6 and IPLeak encode IPv6 targets and reject mismatched families", () => {
  const ip = "2001:4860:4860::8888";
  for (const source of ["mir6", "ipleak"] as const) {
    assert.ok(publicSourceUrl(source, ip).includes(encodeURIComponent(ip)));
    assert.throws(() => normalizePublicSource(source, bodies[source], ip, time));
  }
});
