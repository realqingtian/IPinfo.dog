import { test } from "node:test";
import assert from "node:assert/strict";
import { createSourcesController } from "../../src/features/ip/sources.ts";
import { maxmindSource, extraSourceIds, type ExtraSourceId, type SourceOutcome, type SourceRecord } from "../../src/lib/contracts/ip-sources.ts";
import { normalizePublicSource } from "../../src/features/ip/source-client.ts";
import { ipInformationFixture } from "../fixtures/ip.ts";
const address = "8.8.8.8", time = "2026-11-16T00:00:00Z";
const record = (source: ExtraSourceId): SourceRecord => ({ ...normalizePublicSource("freeipapi", { ipAddress: address, countryCode: "US", asn: "15169", asnOrganization: "Google LLC" }, address, time), source });
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred<T>() { let resolve!: (v: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
test("each direct provider has independent retry generations and late results cannot replace current ones", async () => {
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
  assert.deepEqual(extraSourceIds, ["ipquery", "freeipapi"]);
});
