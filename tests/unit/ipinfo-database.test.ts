import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { normalizeIpinfo, createIpinfoProvider, type IpinfoDataset } from "../../src/server/ipinfo/database.ts";
import { createIpinfoHandler } from "../../src/server/ipinfo/handler.ts";
import { runIpinfoUpdate } from "../../scripts/ipinfo/updater.ts";
import { downloadIpinfo, officialResponse } from "../../scripts/ipinfo/download.ts";
import { createHash } from "node:crypto";
import { fetchLocalIpinfo, validLocalRecord } from "../../src/features/ip/local-source-client.ts";
const address = "8.8.8.8", at = "2026-11-16T12:00:00Z", hash = "a".repeat(64), nextHash = "b".repeat(64);
const row = () => normalizeIpinfo({ country_code: "US", country: "United States", asn: "AS15169", as_name: "Google LLC", as_domain: "google.com" }, address, at, at)!;
const state = (id = hash, lastSuccessAt = at) => ({ schema: 1 as const, active: id, lastAttemptAt: lastSuccessAt, lastSuccessAt, outcome: "updated" as const });
const snapshot = (id = hash, buildTime = at): IpinfoDataset => ({ id, buildTime, get: (ip, queriedAt) => ({ ...row(), address: ip, queriedAt }) });
test("IPinfo local schema preserves missing city and rejects malformed ASN / domain without borrowing", () => {
  const value = row(); assert.equal(value.city, null); assert.equal(value.domain, "google.com"); assert.equal(value.asn, 15169); assert.equal(value.dataDates.length, 2);
  const sparse = normalizeIpinfo({ country_code: "US", asn: "AS4294967296", as_name: "bad\nname", as_domain: "http://localhost" }, address, at, at)!;
  assert.equal(sparse.asn, null); assert.equal(sparse.organization, null); assert.equal(sparse.domain, null);
  assert.equal(normalizeIpinfo({}, address, at, at), null);
});
test("provider shares cold load, atomically changes snapshots and keeps old data on failed reload", async () => {
  let current = state(), loads = 0, bad = false, clock = Date.parse(at);
  const provider = createIpinfoProvider({ directory: () => "/data/ipinfo", now: () => clock, read: async () => current, load: async path => { loads++; if (bad) throw Error("private path"); return snapshot(path.endsWith(nextHash) ? nextHash : hash); } });
  await Promise.all(Array.from({ length: 5 }, () => provider.lookup(address))); assert.equal(loads, 1);
  current = state(nextHash); bad = true; assert.equal((await provider.lookup(address))?.asn, 15169); assert.equal((await provider.lookup(address))?.updateWarning, true);
  bad = false; clock += 5001; await provider.lookup(address); assert.equal(loads, 3);
});
test("provider warns after 72h and stops after 30d, bad state cannot extend freshness", async () => {
  let clock = Date.parse(at), readFails = false;
  const provider = createIpinfoProvider({ directory: () => "/data", now: () => clock, read: async () => { if (readFails) throw Error(); return state(); }, load: async () => snapshot() });
  assert.equal((await provider.lookup(address))?.updateWarning, false);
  clock += 72 * 3600_000; assert.equal((await provider.lookup(address))?.updateWarning, true);
  readFails = true; clock = Date.parse(at) + 30 * 86400_000; await assert.rejects(provider.lookup(address), /DATA_UNAVAILABLE/);
  await assert.rejects(provider.lookup("127.0.0.1"), /NON_PUBLIC_IP/);
});
test("publication changes while loading cannot activate an unverified generation", async () => {
  let reads = 0;
  const provider = createIpinfoProvider({ directory: () => "/data", read: async () => ++reads === 1 ? state() : state(nextHash), load: async () => snapshot(), now: () => Date.parse(at) });
  await assert.rejects(provider.lookup(address), /DATA_UNAVAILABLE/);
});
test("local handler exposes only IPinfo MMDB, isolates online suppliers and bounds requests / CORS", async () => {
  let calls = 0; const handle = createIpinfoHandler({ lookup: async () => { calls++; return row(); } });
  const base = "https://api.ipinfo.dog/api/ip/sources?";
  for (const source of ["ipquery", "freeipapi", "ipdata", "iplocation", "dbip", "geojs", "https://evil.example"]) assert.equal((await handle(new Request(base + new URLSearchParams({ source, ip: address })))).status, 404);
  for (const query of ["source=ipinfo&ip=8.8.8.8&ip=1.1.1.1", "source=ipinfo&ip=invalid", "source=ipinfo&ip=8.8.8.8&url=http://localhost"]) assert.equal((await handle(new Request(base + query))).status, 400);
  assert.equal((await handle(new Request(base + "source=ipinfo&ip=127.0.0.1"))).status, 422);
  assert.equal(calls, 0);
  const response = await handle(new Request(base + "source=ipinfo&ip=8.8.8.8", { headers: { Origin: "https://ipinfo.dog" } }));
  assert.equal(response.status, 200); assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://ipinfo.dog");
  assert.equal((await handle(new Request(base + "source=ipinfo&ip=8.8.8.8", { headers: { Origin: "https://evil.example" } }))).status, 403);
  const unavailable = createIpinfoHandler({ lookup: async () => { throw Error("secret path and token"); } });
  assert.deepEqual(await (await unavailable(new Request(base + "source=ipinfo&ip=8.8.8.8"))).json(), { ok: false, error: { code: "UNAVAILABLE" } });
});
test("local browser transport authenticates neither downloads nor vendor requests, validates identity", async () => {
  const valid = row(); assert.ok(validLocalRecord(valid, address));
  for (const invalid of [{ ...valid, source: "ipquery" }, { ...valid, address: "1.1.1.1" }, { ...valid, city: { en: "invented" } }, { ...valid, domain: "http://localhost" }]) assert.equal(validLocalRecord(invalid, address), false);
  const transport = (async (url, init) => { assert.equal(String(url), "https://api.ipinfo.dog/api/ip/sources?ip=8.8.8.8&source=ipinfo"); assert.equal(init?.credentials, "omit"); assert.equal(init?.headers, undefined); return Response.json({ ok: true, data: valid }); }) as typeof fetch;
  assert.ok((await fetchLocalIpinfo(address, new AbortController().signal, transport)).ok);
  assert.deepEqual(await fetchLocalIpinfo(address, new AbortController().signal, (async () => Response.json({ ok: true, data: { ...valid, address: "1.1.1.1" } })) as typeof fetch), { ok: false, code: "UNAVAILABLE" });
});
test("download follows only official HTTPS CDN redirects and never sends account token onward", async () => {
  const token = "test_download_token", urls: string[] = [];
  const response = await officialResponse("ipinfo_lite.mmdb", token, new AbortController().signal, (async url => { urls.push(String(url)); return urls.length === 1 ? new Response(null, { status: 302, headers: { Location: "https://dl.assets.ipinfo.io/signed.mmdb?signature=temporary" } }) : new Response("file"); }) as typeof fetch);
  assert.equal(await response.text(), "file"); assert.equal(urls.length, 2); assert.ok(!urls[1].includes(token));
  for (const location of ["http://dl.assets.ipinfo.io/file", "https://evil.example/file", "https://dl.assets.ipinfo.io:8443/file", `https://dl.assets.ipinfo.io/?token=${token}`]) await assert.rejects(officialResponse("ipinfo_lite.mmdb", token, new AbortController().signal, (async () => new Response(null, { status: 302, headers: { Location: location } })) as typeof fetch));
});
test("official SHA256 validates downloads; matching candidate avoids repeat download; mismatch cannot overwrite", async () => {
  const root = await mkdtemp(join(tmpdir(), "ipinfo-download-test-")), bytes = Buffer.alloc(2048, 1), checksum = createHash("sha256").update(bytes).digest("hex"); let downloads = 0;
  const transport = (async url => { if (String(url).includes("checksums")) return Response.json({ checksums: { sha256: checksum } }); downloads++; return new Response(bytes); }) as typeof fetch;
  try {
    await downloadIpinfo(root, "test_download_token", transport); await downloadIpinfo(root, "test_download_token", transport); assert.equal(downloads, 1);
    const original = await readFile(join(root, "ipinfo_lite.mmdb"));
    await assert.rejects(downloadIpinfo(root, "test_download_token", (async url => String(url).includes("checksums") ? Response.json({ checksums: { sha256: nextHash } }) : new Response("bad")) as typeof fetch), /CHECKSUM_MISMATCH/);
    assert.deepEqual(await readFile(join(root, "ipinfo_lite.mmdb")), original);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("updater publishes checked generation, confirms unchanged content and preserves old pointer on failure", async () => {
  const root = await mkdtemp(join(tmpdir(), "ipinfo-update-test-")); let clock = Date.parse(at), value = snapshot(), fail = false;
  const acquire = async (stage: string) => { if (fail) throw Error("partial"); await writeFile(join(stage, "ipinfo_lite.mmdb"), "candidate"); };
  const options = { root, acquire, now: () => clock, validate: async () => value };
  try {
    assert.equal((await runIpinfoUpdate(options)).changed, true); const first = JSON.parse(await readFile(join(root, "state.json"), "utf8"));
    clock += 1000; assert.equal((await runIpinfoUpdate(options)).changed, false);
    const confirmed = JSON.parse(await readFile(join(root, "state.json"), "utf8")); fail = true; clock += 1000;
    await assert.rejects(runIpinfoUpdate(options), /UPDATE_FAILED/); const failed = JSON.parse(await readFile(join(root, "state.json"), "utf8"));
    assert.equal(failed.active, first.active); assert.equal(failed.lastSuccessAt, confirmed.lastSuccessAt); assert.equal(failed.outcome, "failed");
    fail = false; value = snapshot(nextHash); clock += 1000; assert.equal((await runIpinfoUpdate(options)).changed, true); assert.equal((await readdir(join(root, "releases"))).length, 1);
    assert.equal((await readdir(root)).filter(s => s.startsWith(".candidate-")).length, 0);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("updater rejects version regression and repairs a corrupt same-hash physical directory", async () => {
  const root = await mkdtemp(join(tmpdir(), "ipinfo-repair-test-")); let corrupt = false, regress = false;
  const options = { root, now: () => Date.parse(at), acquire: async (stage: string) => { await writeFile(join(stage, "ipinfo_lite.mmdb"), "ok"); }, validate: async (path: string) => {
    if (!path.includes(".candidate-") && corrupt) throw Error("corrupt");
    return snapshot(hash, regress && path.includes(".candidate-") ? "2026-11-15T00:00:00Z" : at);
  } };
  try {
    await runIpinfoUpdate(options); const first = JSON.parse(await readFile(join(root, "state.json"), "utf8")); regress = true; await assert.rejects(runIpinfoUpdate(options)); regress = false;
    corrupt = true; const result = await runIpinfoUpdate(options); assert.equal(result.repaired, true);
    const last = JSON.parse(await readFile(join(root, "state.json"), "utf8")); assert.equal(last.active, first.active); assert.notEqual(last.folder, first.folder);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("local transport bounds body / deadline and cancellation without reaching an online fallback", async () => {
  for (const response of [new Response("x".repeat(16385)), new Response("bad", { headers: { "Content-Length": "999999" } }), Response.json({ ok: false }, { status: 503 })]) {
    assert.deepEqual(await fetchLocalIpinfo(address, new AbortController().signal, (async () => response) as typeof fetch), { ok: false, code: "UNAVAILABLE" });
  }
  const slow = (() => new Promise(() => {})) as typeof fetch;
  assert.deepEqual(await fetchLocalIpinfo(address, new AbortController().signal, slow, 10), { ok: false, code: "TIMEOUT" });
  const abort = new AbortController(), pending = fetchLocalIpinfo(address, abort.signal, slow); abort.abort();
  assert.deepEqual(await pending, { ok: false, code: "UNAVAILABLE" });
  let calls = 0; await fetchLocalIpinfo("127.0.0.1", new AbortController().signal, (async () => { calls++; throw Error(); }) as typeof fetch); assert.equal(calls, 0);
});
