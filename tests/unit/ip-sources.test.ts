import { test } from "node:test";
import assert from "node:assert/strict";
import { createSourcesController } from "../../src/features/ip/sources.ts";
import { maxmindSource, extraSourceIds, type ExtraSourceId, type SourceOutcome, type SourceRecord } from "../../src/lib/contracts/ip-sources.ts";
import { comparisonCatalog, comparisonPlan, homeGeoSourceIds, lookupGeoSourceIds } from "../../src/features/ip/comparison-catalog.ts";
import { normalizePublicSource } from "../../src/features/ip/source-client.ts";
import { ipInformationFixture } from "../fixtures/ip.ts";
const address = "8.8.8.8", time = "2026-11-16T00:00:00Z";
const record = (source: ExtraSourceId): SourceRecord => ({ ...normalizePublicSource("freeipapi", { ipAddress: address, countryCode: "US", asn: "15169", asnOrganization: "Google LLC" }, address, time), source });
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred<T>() { let resolve!: (v: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
test("each local and direct provider has independent retry generations and late results cannot replace current ones", async () => {
  for (const source of extraSourceIds) {
    const old = deferred<SourceOutcome>(); let calls = 0;
    const controller = createSourcesController(address, async id => {
      if (id !== source) return { ok: true, data: record(id) };
      return ++calls === 1 ? old.promise : { ok: true, data: { ...record(id), organization: "new" } };
    });
    controller.refresh(); await tick(); controller.retry(source); await tick(); old.resolve({ ok: true, data: { ...record(source), organization: "old" } }); await tick();
    const state = controller.getSnapshot(), row = state[source]; assert.equal(row.phase, "done");
    if (row.phase === "done" && row.outcome.ok) assert.equal(row.outcome.data.organization, "new");
    for (const id of extraSourceIds) if (id !== source) assert.equal(state[id].phase, "done");
    controller.dispose();
  }
});
test("disposed controllers cannot publish late data and one failed vendor leaves others available", async () => {
  const late = deferred<SourceOutcome>(); let updates = 0;
  const controller = createSourcesController(address, () => late.promise); controller.subscribe(() => updates++); controller.refresh(); controller.dispose(); const count = updates;
  late.resolve({ ok: true, data: record("freeipapi") }); await tick(); assert.equal(updates, count);
  const c = createSourcesController(address, async id => { if (id === "freeipapi") throw Error("private diagnostic"); return { ok: true, data: record(id) }; });
  c.refresh(); await tick(); assert.equal(c.getSnapshot().ipquery.phase, "done"); assert.deepEqual(c.getSnapshot().freeipapi, { phase: "done", outcome: { ok: false, code: "UNAVAILABLE" } }); c.dispose();
});
test("MaxMind editions remain one supplier with local build dates", () => {
  const info = ipInformationFixture(); const row = maxmindSource(info);
  assert.equal(row.source, "maxmind"); assert.equal(row.dataDates.length, 3); assert.equal(row.country, info.geolocatedCountry);
  assert.deepEqual(extraSourceIds, ["ipinfo", "ipinfoOnline", "ipquery", "freeipapi", "ipdata", "iplocation", "mir6", "ipleak"]);
});


test("both pages exclude echo-only vendors from the same source catalog and only request target-capable sources", async () => {
  const home = comparisonPlan("home"), lookup = comparisonPlan("lookup");
  const identity = (source: typeof home[number]) => [source.id, source.label, source.href];
  assert.equal(home.length, 9); assert.equal(new Set(home.map(source => source.id)).size, 9);
  assert.deepEqual(home.map(identity), comparisonCatalog.map(source => [source.id, source.label, source.href]));
  assert.deepEqual(lookup.map(identity), home.map(identity));
  assert.deepEqual(home.slice(0, 1).map(source => source.id), ["mir6"]);
  for (const id of ["mir6", "ipleak"]) {
    assert.equal(home.find(source => source.id === id)?.kind, "echo");
    assert.equal(lookup.find(source => source.id === id)?.kind, "query");
  }
  const removed = ["ddnspod", "ipify", "ident", "icanhazip", "wtfismyip"];
  assert.ok(home.every(source => !removed.includes(source.id)));
  assert.ok(lookup.every(source => !removed.includes(source.id) && source.query !== null));
  const calls: ExtraSourceId[] = [];
  const controller = createSourcesController(address, async id => { calls.push(id); return { ok: true, data: record(id) }; }, lookupGeoSourceIds);
  controller.refresh(); await tick();
  assert.deepEqual(calls, lookup.filter(source => source.kind === "query" && source.query !== "maxmind").map(source => source.query));
  assert.equal(calls.length, 8);
  assert.ok(calls.every(id => !removed.includes(id)));
  controller.dispose();
});
test("homepage does not issue duplicate target lookups for echo providers or allow inactive-source retries", async () => {
  const calls: ExtraSourceId[] = [];
  const controller = createSourcesController(address, async id => { calls.push(id); return { ok: true, data: record(id) }; }, homeGeoSourceIds);
  controller.refresh(); await tick(); controller.retry("mir6"); controller.retry("ipleak"); await tick();
  assert.deepEqual(calls, ["ipinfo", "ipinfoOnline", "ipquery", "freeipapi", "ipdata", "iplocation"]);
  controller.dispose();
});
