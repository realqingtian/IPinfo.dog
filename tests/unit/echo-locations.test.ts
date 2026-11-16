import { test } from "node:test";
import assert from "node:assert/strict";
import { createEchoLocations } from "../../src/features/ip/echo-locations.ts";
import type { LookupOutcome } from "../../src/features/ip/query.ts";
import { ipInformationFixture } from "../fixtures/ip.ts";
const tick = () => new Promise(resolve => setImmediate(resolve));

test("exit locations deduplicate addresses and reuse the primary MMDB result", async () => {
  const calls: string[] = [];
  const store = createEchoLocations(async address => { calls.push(address); return { ok: true, data: ipInformationFixture(address) }; });
  store.sync(["8.8.8.8", "8.8.8.8", "1.1.1.1"], ipInformationFixture("1.1.1.1"));
  store.sync(["8.8.8.8", "1.1.1.1"], ipInformationFixture("1.1.1.1"));
  await tick();
  assert.deepEqual(calls, ["8.8.8.8"]);
  assert.equal(store.getSnapshot()["1.1.1.1"].phase, "done");
  store.dispose();
});

test("pending primary lookup is shared and falls back only after primary failure", async () => {
  const calls: string[] = [];
  const store = createEchoLocations(async address => { calls.push(address); return { ok: true, data: ipInformationFixture(address) }; });
  store.sync(["8.8.8.8"], null, "8.8.8.8");
  assert.equal(calls.length, 0);
  store.sync(["8.8.8.8"], null);
  await tick();
  assert.deepEqual(calls, ["8.8.8.8"]);
});

test("cancelled and late lookups cannot replace locations for changed exits", async () => {
  const pending: { resolve: (outcome: LookupOutcome) => void; signal: AbortSignal }[] = [];
  const store = createEchoLocations((_, signal) => new Promise(resolve => pending.push({ resolve, signal })));
  store.sync(["8.8.8.8"]);
  store.sync(["1.1.1.1"]);
  assert.equal(pending[0].signal.aborted, true);
  pending[0].resolve({ ok: true, data: ipInformationFixture("8.8.8.8") });
  await tick();
  assert.equal(store.getSnapshot()["8.8.8.8"], undefined);
  store.dispose();
  pending[1].resolve({ ok: true, data: ipInformationFixture("1.1.1.1") });
  await tick();
  assert.equal(store.getSnapshot()["1.1.1.1"], undefined);
});

test("failed location can be retried once for every matching source row", async () => {
  let count = 0;
  const store = createEchoLocations(async address => ++count === 1 ? { ok: false, code: "TIMEOUT", retryable: true } : { ok: true, data: ipInformationFixture(address) });
  store.sync(["8.8.8.8"]);
  await tick();
  store.retry("8.8.8.8");
  store.retry("8.8.8.8");
  await tick();
  assert.equal(count, 2);
  const row = store.getSnapshot()["8.8.8.8"];
  assert.ok(row.phase === "done" && row.outcome.ok);
});
