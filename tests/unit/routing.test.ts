import assert from "node:assert/strict";
import test from "node:test";
import { routingTargets, type RoutingTarget } from "../../src/features/routing/catalog.ts";
import { parseTrace, detectTarget, createRoutingController, routingSummary, compareReference, type RoutingOutcome, type RoutingSnapshot } from "../../src/features/routing/detection.ts";

const target = routingTargets.find(item => item.id === "cloudflare")!;
const ref: RoutingTarget = { ...target, id: "reference", group: "reference" };
const success = (address = "8.8.8.8"): RoutingOutcome => ({ ok: true, data: { address, family: address.includes(":") ? "ipv6" : "ipv4", country: "US", colo: "LAX", elapsedMs: 10 } });
const done = (address: string) => ({ phase: "done" as const, outcome: success(address) });
const tick = () => new Promise<void>(resolve => setImmediate(resolve));

test("trace parsing normalizes public addresses and never treats the edge node as a city", () => {
  assert.deepEqual(parseTrace("fl=abc\nip=2001:4860:4860:0:0:0:0:8888\nloc=US\ncolo=LAX\n"), { address: "2001:4860:4860::8888", family: "ipv6", country: "US", colo: "LAX" });
  assert.equal(parseTrace("ip=8.8.8.8\nloc=invalid\ncolo=<script>").country, null);
  for (const body of ["ip=127.0.0.1", "ip=2001:db8::1", "ip=8.8.8.8\nip=1.1.1.1", "<html>ip=8.8.8.8</html>", "ip=8.8.8.8, 1.1.1.1", "loc=US"]) assert.throws(() => parseTrace(body));
});

test("transport is browser-direct, credential-free, redirect-free and body bounded", async () => {
  let init: RequestInit | undefined;
  const result = await detectTarget(target, new AbortController().signal, { transport: async (url, options) => { assert.equal(url, target.url); init = options; return new Response("ip=8.8.8.8\nloc=US\ncolo=LAX"); } });
  assert.equal(result.ok, true); assert.equal(init?.mode, "cors"); assert.equal(init?.credentials, "omit"); assert.equal(init?.redirect, "error"); assert.equal(init?.cache, "no-store"); assert.equal(init?.referrerPolicy, "no-referrer");
  for (const response of [new Response("x".repeat(4097)), new Response("ip=8.8.8.8", { headers: { "Content-Length": "5000" } }), new Response("<html>not an address</html>")]) {
    const rejected = await detectTarget(target, new AbortController().signal, { transport: async () => response });
    assert.deepEqual(rejected, { ok: false, code: "NO_ADDRESS" });
  }
});

test("header probes only use explicitly readable public IPs and do not download images", async () => {
  const header = routingTargets.find(item => item.id === "netease")!;
  const ok = await detectTarget(header, new AbortController().signal, { transport: async (_url, options) => { assert.equal(options?.method, "HEAD"); return new Response(null, { headers: { "cdn-user-ip": "8.8.8.8", "Content-Length": "100000" } }); } });
  assert.equal(ok.ok, true);
  for (const value of ["127.0.0.1", "8.8.8.8, 1.1.1.1", "example.com", ""]) assert.deepEqual(await detectTarget(header, new AbortController().signal, { transport: async () => new Response(null, { headers: { "cdn-user-ip": value } }) }), { ok: false, code: "NO_ADDRESS" });
});

test("rate limits, unreadable network results, deadlines and cancellation stay distinct", async () => {
  assert.deepEqual(await detectTarget(target, new AbortController().signal, { transport: async () => new Response(null, { status: 429 }) }), { ok: false, code: "RATE_LIMITED" });
  assert.deepEqual(await detectTarget(target, new AbortController().signal, { transport: async () => { throw new TypeError("CORS blocked"); } }), { ok: false, code: "UNAVAILABLE" });
  assert.deepEqual(await detectTarget(target, new AbortController().signal, { timeoutMs: 5, transport: () => new Promise(() => {}) }), { ok: false, code: "TIMEOUT" });
  const abort = new AbortController();
  const pending = detectTarget(target, abort.signal, { transport: () => new Promise(() => {}) }); abort.abort();
  assert.deepEqual(await pending, { ok: false, code: "CANCELLED" });
});

test("the shared catalog restricts requests to fixed HTTPS destinations and excluded sources stay absent", () => {
  assert.equal(new Set(routingTargets.map(item => item.id)).size, routingTargets.length);
  for (const item of routingTargets) { const url = new URL(item.url); assert.equal(url.protocol, "https:"); assert.equal(url.username + url.password, ""); assert.ok(item.format === "header" || url.pathname === "/cdn-cgi/trace"); }
  assert.ok(!routingTargets.some(item => /ip138|ipip|1password/i.test(item.url)));
});

test("IPv4 and IPv6 are not counted as evidence of split routing", () => {
  const targets = [ref, target, { ...target, id: "ipv6" }];
  const rows: RoutingSnapshot = { reference: done("8.8.8.8"), cloudflare: done("8.8.8.8"), ipv6: done("2001:4860:4860::8888") };
  const summary = routingSummary(rows, targets);
  assert.equal(summary.different, false); assert.equal(summary.ipv4, 1); assert.equal(summary.ipv6, 1); assert.equal(summary.groups[0].sites, 2);
  assert.equal(routingSummary({ ...rows, cloudflare: done("1.1.1.1") }, targets).different, true);
});

test("reference comparison requires a consistent reference in the same address family", () => {
  const result = success(); if (!result.ok) throw new Error();
  const secondRef = { ...ref, id: "ref2" }, targets = [ref, secondRef, target];
  assert.equal(compareReference(result.data, {}, targets), "noReference");
  assert.equal(compareReference(result.data, { reference: done("2001:4860:4860::8888") }, targets), "noReference");
  assert.equal(compareReference(result.data, { reference: done("8.8.8.8") }, targets), "same");
  assert.equal(compareReference(result.data, { reference: done("1.1.1.1") }, targets), "different");
  assert.equal(compareReference(result.data, { reference: done("8.8.8.8"), ref2: done("1.1.1.1") }, targets), "ambiguous");
});

test("controller bounds concurrency, retries one site, and ignores superseded results", async () => {
  const targets = [ref, target, { ...target, id: "third" }];
  const pending: { id: string; resolve: (outcome: RoutingOutcome) => void }[] = [];
  const controller = createRoutingController({ targets, concurrency: 2, detect: item => new Promise(resolve => pending.push({ id: item.id, resolve })) });
  controller.refresh(); await tick(); assert.equal(pending.length, 2); assert.equal(controller.getSnapshot().third.phase, "queued");
  controller.refresh(); pending[0].resolve(success("1.1.1.1")); pending[1].resolve(success("1.1.1.1")); await tick();
  assert.equal(pending.length, 4); assert.equal(controller.getSnapshot().reference.phase, "loading");
  pending[2].resolve(success()); pending[3].resolve(success()); await tick(); assert.equal(pending.length, 5);
  pending[4].resolve(success()); await tick();
  assert.equal(routingSummary(controller.getSnapshot(), targets).success, 3);
  const previous = controller.getSnapshot().reference;
  controller.retry("cloudflare"); await tick(); assert.equal(pending.length, 6); assert.equal(controller.getSnapshot().reference, previous);
  const beforeDispose = controller.getSnapshot();
  controller.dispose(); pending[5].resolve(success("1.1.1.1")); await tick();
  assert.equal(controller.getSnapshot(), beforeDispose);
});
