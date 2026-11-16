import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createIpinfoSource, normalizeIpinfo } from "../../src/server/ip-sources/ipinfo.ts";
import { createDbipSource, loadDbipDataset, type DbipDataset } from "../../src/server/ip-sources/dbip.ts";
import { createSourceService } from "../../src/server/ip-sources/service.ts";
import { SourceError } from "../../src/server/ip-sources/error.ts";
import { createIpSourcesHandler } from "../../src/server/http/ip-sources-handler.ts";
import { createRequestBudget } from "../../src/server/http/ip-handler.ts";
import { createSourcesController, fetchSource } from "../../src/features/ip/sources.ts";
import { maxmindSource, type ExtraSourceId, type SourceOutcome, type SourceRecord } from "../../src/lib/contracts/ip-sources.ts";
import { ipInformationFixture } from "../fixtures/ip.ts";
import { updateDbip } from "../../scripts/dbip/update.ts";

const address = "8.8.8.8", time = "2026-11-16T00:00:00.000Z";
const body = { ip: address, country: "United States", country_code: "US", asn: "AS15169", as_name: "Google LLC", as_domain: "google.com" };
const record = (source: ExtraSourceId = "ipinfo", ip = address): SourceRecord => ({ ...normalizeIpinfo({ ...body, ip }, ip, time), source });
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred<T>() { let resolve!: (v: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }

test("IPinfo uses fixed HTTPS with Bearer, explicit normalized target and no browser credential", async () => {
  let called = false;
  const lookup = createIpinfoSource({ getToken: async () => "fictional-test-token", now: () => Date.parse(time), transport: (async (url, init) => {
    called = true; assert.equal(String(url), "https://api.ipinfo.io/lite/8.8.8.8"); assert.equal(init?.redirect, "error");
    assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer fictional-test-token");
    assert.ok(!String(url).includes("token")); return Response.json(body);
  }) as typeof fetch });
  const value = await lookup("::ffff:8.8.8.8"); assert.ok(called); assert.equal(value.city, null); assert.equal(value.asn, 15169); assert.deepEqual(value.dataDates, []);
  assert.ok(!JSON.stringify(value).includes("fictional-test-token"));
});
test("missing token and non-public targets never call vendor", async () => {
  let calls = 0; const lookup = createIpinfoSource({ getToken: async () => undefined, transport: (async () => { calls++; throw Error(); }) as typeof fetch });
  await assert.rejects(lookup(address), { code: "NOT_CONFIGURED" });
  await assert.rejects(lookup("127.0.0.1")); assert.equal(calls, 0);
});
test("IPinfo rejects wrong identity, malformed JSON and oversized streams without leaking upstream text", async () => {
  for (const response of [Response.json({ ...body, ip: "1.1.1.1" }), new Response("not-json-secret"), new Response("x".repeat(65_537)), new Response("secret", { headers: { "Content-Length": "1000000" } })]) {
    await assert.rejects(createIpinfoSource({ getToken: async () => "fake", transport: (async () => response) as typeof fetch })(address), error => error instanceof SourceError && error.message === "UNAVAILABLE");
  }
});
test("IPinfo handles sparse data and bounds ASN rather than inventing records", () => {
  assert.throws(() => normalizeIpinfo({ ip: address }, address, time), { code: "NO_RECORD" });
  const value = normalizeIpinfo({ ip: address, country_code: "US", asn: "AS4294967296" }, address, time);
  assert.equal(value.asn, null); assert.equal(value.city, null); assert.equal(value.country?.code, "US");
});
test("upstream 429 / authentication rejection / network errors map to safe separate states", async () => {
  for (const [status, code] of [[429, "RATE_LIMITED"], [401, "UNAVAILABLE"], [500, "UNAVAILABLE"]] as const) {
    await assert.rejects(createIpinfoSource({ getToken: async () => "fake", transport: (async () => new Response("secret", { status })) as typeof fetch })(address), { code });
  }
  await assert.rejects(createIpinfoSource({ getToken: async () => "fake", transport: (async () => { throw Error("secret"); }) as typeof fetch })(address), { code: "UNAVAILABLE" });
});
test("IPinfo enforces its deadline even when a transport ignores abort", async () => {
  let signal: AbortSignal | null | undefined;
  const lookup = createIpinfoSource({ getToken: async () => "fake", timeoutMs: 10, transport: ((_url, init) => { signal = init?.signal; return new Promise(() => {}); }) as typeof fetch });
  await assert.rejects(lookup(address), { code: "TIMEOUT" }); assert.equal(signal?.aborted, true);
});
test("source service coalesces requests, returns copies, caches and expires independently", async () => {
  let clock = 0, calls = 0;
  const api = async () => { calls++; return record(); };
  const service = createSourceService({ sources: { ipinfo: api, dbip: async () => record("dbip") }, now: () => clock, ttlMs: 10 });
  const results = await Promise.all([service.lookup("ipinfo", address), service.lookup("ipinfo", address)]);
  assert.equal(calls, 1); if (results[0].ok) results[0].data.organization = "changed";
  const cached = await service.lookup("ipinfo", address); assert.ok(cached.ok); assert.equal(cached.data.organization, "Google LLC");
  clock = 11; await service.lookup("ipinfo", address); assert.equal(calls, 2);
});
test("one failed provider cannot block another and raw errors are redacted", async () => {
  const service = createSourceService({ sources: { ipinfo: async () => { throw Error("secret"); }, dbip: async () => record("dbip") } });
  assert.deepEqual(await service.lookup("ipinfo", address), { ok: false, code: "UNAVAILABLE" });
  assert.equal((await service.lookup("dbip", address)).ok, true);
});
test("source service has bounded concurrency and does not cache mismatched supplier identities", async () => {
  const waiting = deferred<SourceRecord>();
  const service = createSourceService({ sources: { ipinfo: () => waiting.promise, dbip: async () => record() }, concurrency: 1 });
  const first = service.lookup("ipinfo", address);
  assert.deepEqual(await service.lookup("dbip", address), { ok: false, code: "RATE_LIMITED" });
  waiting.resolve(record()); await first;
  assert.deepEqual(await service.lookup("dbip", address), { ok: false, code: "UNAVAILABLE" });
});
test("handler rejects extra params / arbitrary sources / private addresses before any lookup", async () => {
  let calls = 0;
  const handle = createIpSourcesHandler({ lookup: async () => { calls++; return { ok: true, data: record() }; } });
  for (const query of ["ip=8.8.8.8&source=https://evil.example", "ip=127.0.0.1&source=ipinfo", "ip=8.8.8.8&source=ipinfo&ip=1.1.1.1", "ip=8.8.8.8&source=ipinfo&token=x", "source=ipinfo"]) {
    assert.ok((await handle(new Request(`https://api.ipinfo.dog/api/ip/sources?${query}`))).status >= 400);
  }
  assert.equal(calls, 0);
});
test("handler CORS/preflight and rate budgets preserve the frontend-only boundary", async () => {
  let calls = 0;
  const handle = createIpSourcesHandler({ lookup: async (_s, ip) => { calls++; assert.equal(ip, address); return { ok: true, data: record() }; }, budget: createRequestBudget({ limit: 1 }) });
  const url = "https://api.ipinfo.dog/api/ip/sources?ip=::ffff:8.8.8.8&source=ipinfo";
  assert.equal((await handle(new Request(url, { headers: { Origin: "https://evil.example" } }))).status, 403);
  assert.equal((await handle(new Request(url, { method: "OPTIONS", headers: { Origin: "https://ipinfo.dog", "Access-Control-Request-Method": "GET" } }))).status, 204);
  const good = await handle(new Request(url, { headers: { Origin: "https://ipinfo.dog" } }));
  assert.equal(good.status, 200); assert.equal(good.headers.get("Access-Control-Allow-Origin"), "https://ipinfo.dog"); assert.equal(good.headers.get("Cache-Control"), "private, no-store");
  assert.equal((await handle(new Request(url))).status, 429); assert.equal(calls, 1);
});
test("browser source client rejects mismatched payloads and uses omit/no-referrer", async () => {
  const transport = (async (_url, init) => { assert.equal(init?.credentials, "omit"); assert.equal(init?.referrerPolicy, "no-referrer"); return Response.json({ ok: true, data: record("dbip") }); }) as typeof fetch;
  assert.deepEqual(await fetchSource("ipinfo", address, new AbortController().signal, transport), { ok: false, code: "UNAVAILABLE" });
  const r = await fetchSource("ipinfo", address, new AbortController().signal, (async () => Response.json({ ok: true, data: record() })) as typeof fetch);
  assert.equal(r.ok, true);
});
test("per-source retry ignores late data and leaves other source intact", async () => {
  const old = deferred<SourceOutcome>(); let calls = 0;
  const controller = createSourcesController(address, async (id) => { if (id === "dbip") return { ok: true, data: record("dbip") }; calls++; return calls === 1 ? old.promise : { ok: true, data: { ...record(), organization: "new" } }; });
  controller.refresh(); await tick(); controller.retry("ipinfo"); await tick(); old.resolve({ ok: true, data: { ...record(), organization: "old" } }); await tick();
  const state = controller.getSnapshot(); assert.equal(state.dbip.phase, "done"); assert.equal(state.ipinfo.phase, "done");
  if (state.ipinfo.phase === "done" && state.ipinfo.outcome.ok) assert.equal(state.ipinfo.outcome.data.organization, "new");
  controller.dispose();
});
test("disposed source controller cannot publish late data or modify manual query history", async () => {
  const late = deferred<SourceOutcome>(); let updates = 0;
  const c = createSourcesController(address, () => late.promise); c.subscribe(() => updates++); c.refresh(); c.dispose(); const count = updates;
  late.resolve({ ok: true, data: record() }); await tick(); assert.equal(updates, count);
});
test("MaxMind editions remain one supplier and preserve different dataset dates", () => {
  const info = ipInformationFixture(); const row = maxmindSource(info);
  assert.equal(row.source, "maxmind"); assert.equal(row.dataDates.length, 3); assert.equal(row.country, info.geolocatedCountry);
});

test("DB-IP loader rejects traversal and invalid binary before activation", async () => {
  await assert.rejects(loadDbipDataset("/missing", "../../evil"), { code: "UNAVAILABLE" });
  const dir = await mkdtemp(join(tmpdir(), "ipinfo-dbip-test-")), generation = "a".repeat(64) + "-" + "b".repeat(12);
  try { await mkdir(join(dir, "releases", generation), { recursive: true }); await writeFile(join(dir, "releases", generation, "city.mmdb"), "broken"); await assert.rejects(loadDbipDataset(dir, generation)); }
  finally { await rm(dir, { recursive: true, force: true }); }
});
test("DB-IP failed new generation preserves a validated one, but does not serve expired data", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ipinfo-dbip-state-")), first = "a".repeat(64) + "-" + "b".repeat(12), second = "c".repeat(64) + "-" + "d".repeat(12);
  let clock = Date.parse(time);
  const reader = { metadata: { buildEpoch: new Date(time) }, get: () => ({ country: { iso_code: "US" } }) };
  try {
    await writeFile(join(dir, "state.json"), JSON.stringify({ generation: first }));
    const lookup = createDbipSource({ directory: () => dir, checkMs: 10, now: () => clock, load: async (_dir, generation) => { if (generation === second) throw Error("bad"); return { generation, city: reader, asn: reader } as unknown as DbipDataset; } });
    assert.equal((await lookup(address)).country?.code, "US");
    await writeFile(join(dir, "state.json"), JSON.stringify({ generation: second })); clock += 11;
    assert.equal((await lookup(address)).country?.code, "US"); clock += 101 * 86_400_000;
    await assert.rejects(lookup(address), { code: "UNAVAILABLE" });
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test("DB-IP rejected / invalid downloads never replace the previous atomic state", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ipinfo-dbip-update-"));
  const original = JSON.stringify({ generation: "previous", month: "2026-10" });
  try {
    await writeFile(join(dir, "state.json"), original);
    for (const response of [new Response(null, { status: 404 }), new Response("bad-gzip")]) {
      await assert.rejects(updateDbip(dir, "2026-11", (async () => response) as typeof fetch)); assert.equal(await readFile(join(dir, "state.json"), "utf8"), original);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});
