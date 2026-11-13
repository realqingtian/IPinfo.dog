import { test } from "node:test";
import assert from "node:assert/strict";
import { routingTargets, routingCategories } from "../../src/features/routing/catalog.ts";
import { probeRoutingTarget, routingPolicy, traceAddress, type RoutingOutcome } from "../../src/features/routing/probe.ts";
import { createRoutingController, groupExits, type RoutingSnapshot } from "../../src/features/routing/controller.ts";

const tick = () => new Promise(resolve => setImmediate(resolve));
const signal = () => new AbortController().signal;
const result = (address = "8.8.8.8"): RoutingOutcome => ({ ok: true, measurement: { address, family: address.includes(":") ? "ipv6" : "ipv4", elapsedMs: 20, checkedAt: "2026-11-13T00:00:00Z" } });
const trace = routingTargets.find(t => t.method === "trace")!;
const header = routingTargets.find(t => t.id === "netease")!;

test("routing catalog contains the 33 supported HTTPS targets and safe fixed methods", () => {
  assert.equal(routingTargets.length, 33); assert.equal(new Set(routingTargets.map(t => t.id)).size, 33);
  assert.deepEqual(Object.fromEntries(routingCategories.map(c => [c, routingTargets.filter(t => t.category === c).length])), { domestic: 4, social: 4, ai: 9, crypto: 4, tools: 5, dev: 6, media: 1 });
  for (const target of routingTargets) { const u = new URL(target.url); assert.equal(u.protocol, "https:"); assert.equal(u.username + u.password + u.search + u.hash, ""); assert.ok(target.method === "header" ? target.headers?.length : u.pathname === "/cdn-cgi/trace"); }
});
test("trace parser accepts one public address, normalizes mapped IPv4, and rejects ambiguous or private fields", () => {
  assert.deepEqual(traceAddress("fl=1\nip=::ffff:8.8.8.8\ncolo=HKG"), { address: "8.8.8.8", family: "ipv4" });
  assert.deepEqual(traceAddress("ip=2001:4860:4860::8888\n"), { address: "2001:4860:4860::8888", family: "ipv6" });
  for (const text of ["ip=8.8.8.8\nip=1.1.1.1", "ip=127.0.0.1", "ip=2001:db8::1", "ip=https://1.1.1.1", "ip=invalid"]) assert.deepEqual(traceAddress(text), { ok: false, code: "INVALID_DATA" });
  assert.deepEqual(traceAddress("<html>8.8.8.8</html>"), { ok: false, code: "NO_IP" });
});
test("browser probes omit credentials and referrer, bypass cache, prohibit redirects and add per-request nonce", async () => {
  let time = 2;
  const r = await probeRoutingTarget(trace, signal(), { nonce: () => "fresh-check", clock: () => time, now: () => 0, transport: async (url, init) => {
    assert.equal(new URL(String(url)).searchParams.get("ipinfo_probe"), "fresh-check");
    assert.equal(init?.method, "GET"); assert.equal(init?.credentials, "omit"); assert.equal(init?.referrerPolicy, "no-referrer"); assert.equal(init?.cache, "no-store"); assert.equal(init?.mode, "cors"); assert.equal(init?.redirect, "error"); assert.equal(init?.headers, undefined);
    time = 27.8; return new Response("ip=8.8.8.8\n");
  } });
  assert.ok(r.ok); assert.equal(r.measurement.elapsedMs, 26); assert.equal(r.measurement.checkedAt, "1970-01-01T00:00:00.000Z");
});
test("header probes require exposed exact public-address fields, not IP-looking text elsewhere", async () => {
  const r = await probeRoutingTarget(header, signal(), { transport: async (_u, init) => { assert.equal(init?.method, "HEAD"); return new Response(null, { headers: { "cdn-user-ip": "8.8.8.8" } }); } });
  assert.ok(r.ok);
  for (const value of [null, "127.0.0.1", "client=8.8.8.8", "8.8.8.8, 1.1.1.1"]) {
    const headers: Record<string, string> = value ? { "cdn-user-ip": value } : {};
    const r = await probeRoutingTarget(header, signal(), { transport: async () => new Response(null, { headers }) }); assert.deepEqual(r, { ok: false, code: "NO_IP" });
  }
});
test("HTTP failures, unreadable CORS and HTML challenge responses never become successful exits", async () => {
  assert.deepEqual(await probeRoutingTarget(trace, signal(), { transport: async () => new Response(null, { status: 429 }) }), { ok: false, code: "HTTP_ERROR", status: 429 });
  assert.deepEqual(await probeRoutingTarget(trace, signal(), { transport: async () => { throw new TypeError("CORS"); } }), { ok: false, code: "REQUEST_FAILED" });
  assert.deepEqual(await probeRoutingTarget(trace, signal(), { transport: async () => new Response("ip=8.8.8.8", { headers: { "Content-Type": "text/html" } }) }), { ok: false, code: "INVALID_DATA" });
});
test("stream and declared body size are bounded; a valid-looking prefix does not bypass the cap", async () => {
  assert.deepEqual(await probeRoutingTarget(trace, signal(), { transport: async () => new Response("ip=8.8.8.8", { headers: { "Content-Length": String(routingPolicy.maxBytes + 1) } }) }), { ok: false, code: "TOO_LARGE" });
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new TextEncoder().encode("ip=8.8.8.8\n" + "x".repeat(routingPolicy.maxBytes))); }, cancel() { cancelled = true; } });
  assert.deepEqual(await probeRoutingTarget(trace, signal(), { transport: async () => new Response(stream, { headers: { "Content-Type": "text/plain" } }) }), { ok: false, code: "TOO_LARGE" }); assert.equal(cancelled, true);
});
test("probe deadline and cancellation bound a transport which ignores abort", async () => {
  assert.deepEqual(await probeRoutingTarget(trace, signal(), { timeoutMs: 5, transport: () => new Promise(() => {}) }), { ok: false, code: "TIMEOUT" });
  const abort = new AbortController(); const pending = probeRoutingTarget(trace, abort.signal, { transport: () => new Promise(() => {}) }); abort.abort(); assert.deepEqual(await pending, { ok: false, code: "CANCELLED" });
  assert.deepEqual(await probeRoutingTarget(trace, abort.signal, { transport: async () => { throw new Error("must not start"); } }), { ok: false, code: "CANCELLED" });
});
test("opening the page creates no probes, and unknown target IDs cannot become request URLs", async () => {
  let calls = 0; const c = createRoutingController({ targets: routingTargets, probe: async () => { calls++; return result(); } });
  await tick(); c.retry("https://attacker.example"); await tick(); assert.equal(calls, 0); assert.ok(Object.values(c.getSnapshot()).every(s => s.phase === "idle"));
  c.retry(routingTargets[0].id); await tick(); assert.equal(calls, 1); assert.equal(Object.values(c.getSnapshot()).filter(s => s.phase === "success").length, 1);
});
test("queue limits active work to four and immediately starts another target when a slot completes", async () => {
  const pending: ((v: RoutingOutcome) => void)[] = []; const targets = routingTargets.slice(0, 6);
  const c = createRoutingController({ targets, probe: () => new Promise(resolve => pending.push(resolve)) }); c.runAll(); await tick();
  assert.equal(pending.length, 4); assert.equal(Object.values(c.getSnapshot()).filter(s => s.phase === "queued").length, 2);
  pending[0](result()); await tick(); assert.equal(pending.length, 5); assert.equal(c.getSnapshot()[targets[0].id].phase, "success"); c.cancel();
  for (const finish of pending) finish(result()); await tick();
});
test("repeated all-retests share the global cap even if obsolete requests ignore abort", async () => {
  const pending: { signal: AbortSignal; finish: (v: RoutingOutcome) => void }[] = [], targets = routingTargets.slice(0, 6);
  const c = createRoutingController({ targets, probe: (_t, signal) => new Promise(finish => pending.push({ signal, finish })) });
  c.runAll(); await tick(); c.runAll(); await tick(); assert.equal(pending.length, 4); assert.ok(pending.every(p => p.signal.aborted));
  for (const p of pending.slice()) p.finish(result()); await tick(); assert.equal(pending.length, 8); assert.equal(Object.values(c.getSnapshot()).filter(s => s.phase === "success").length, 0);
  c.cancel(); for (const p of pending) p.finish(result()); await tick();
});
test("single retry discards late prior results and preserves completed neighbors", async () => {
  const targets = routingTargets.slice(0, 2), pending: ((v: RoutingOutcome) => void)[] = [];
  const c = createRoutingController({ targets, probe: target => target.id === targets[0].id ? new Promise(resolve => pending.push(resolve)) : Promise.resolve(result()) });
  c.runAll(); await tick(); const neighbor = c.getSnapshot()[targets[1].id]; c.retry(targets[0].id); await tick();
  pending[1](result("1.1.1.1")); await tick(); pending[0](result("8.8.8.8")); await tick(); assert.equal(c.getSnapshot()[targets[0].id].measurement?.address, "1.1.1.1"); assert.equal(c.getSnapshot()[targets[1].id], neighbor);
});
test("cancel prevents queued starts, keeps successes and rejects late completion; navigation stops updates", async () => {
  const targets = routingTargets.slice(0, 6), pending: ((v: RoutingOutcome) => void)[] = []; let updates = 0;
  const c = createRoutingController({ targets, probe: () => new Promise(resolve => pending.push(resolve)) }); c.subscribe(() => { updates++; });
  c.runAll(); await tick(); pending[0](result()); await tick(); c.cancel(); const calls = pending.length; for (const finish of pending) finish(result()); await tick();
  assert.equal(pending.length, calls); assert.equal(c.getSnapshot()[targets[0].id].phase, "success"); assert.equal(Object.values(c.getSnapshot()).filter(s => s.phase === "cancelled").length, 5);
  c.retry(targets[0].id); await tick(); c.dispose(); const count = updates; pending.at(-1)!(result()); await tick(); assert.equal(updates, count);
});
test("synchronous failures do not deadlock the queue or turn missing results into a common-IP group", async () => {
  const c = createRoutingController({ targets: routingTargets, probe: () => { throw Error("blocked"); } }); c.runAll(); await tick(); await tick();
  assert.ok(Object.values(c.getSnapshot()).every(s => s.phase === "error")); assert.equal(groupExits(routingTargets, c.getSnapshot()).groups.length, 0);
});
test("same-family multiple exits are distinct from a normal IPv4/IPv6 pair; failed stale data is excluded", () => {
  const targets = routingTargets.slice(0, 4);
  const state: Record<string, RoutingSnapshot[string]> = Object.fromEntries(targets.map(t => [t.id, { phase: "idle", measurement: null, error: null }]));
  const set = (i: number, address: string) => { const r = result(address); assert.ok(r.ok); state[targets[i].id] = { phase: "success", measurement: r.measurement, error: null }; };
  set(0, "8.8.8.8"); set(1, "8.8.8.8"); set(2, "2001:4860:4860::8888");
  const summary = groupExits(targets, state); assert.equal(summary.groups.length, 2); assert.equal(summary.multipleExits, false); assert.equal(summary.groups[0].targets.length, 2);
  set(3, "1.1.1.1"); assert.equal(groupExits(targets, state).multipleExits, true); state[targets[3].id].phase = "error"; assert.equal(groupExits(targets, state).multipleExits, false);
});
