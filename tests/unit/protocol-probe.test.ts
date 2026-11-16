import { test } from "node:test";
import assert from "node:assert/strict";
import { createProtocolDetector, fetchProtocolEcho, fetchProtocolExit, protocolEchoUrls } from "../../src/features/ip/protocol-probe.ts";
import { createExitController } from "../../src/features/ip/exit.ts";
import { maskIpAddress, ipDisplayParts } from "../../src/features/ip/presentation.ts";
import { ipInformationFixture } from "../fixtures/ip.ts";
const tick = () => new Promise<void>(resolve => setImmediate(resolve));
const site = (address: string) => Response.json({ ok: true, data: { address, family: address.includes(":") ? "ipv6" : "ipv4", detectedAt: "2026-11-16T00:00:00Z" } });
const echo = (url: string, address: string) => url.includes("ipify") ? Response.json({ ip: address }) : new Response(address + "\n");

test("IPv4 hides exactly the final two octets, including one-digit and mapped addresses", () => {
  for (const [input, expected] of [["8.8.8.8", "8.8.**.**"], ["123.45.67.89", "123.45.**.**"], ["::ffff:8.8.8.8", "8.8.**.**"]]) assert.equal(maskIpAddress(input), expected);
});
test("IPv6 masks four expanded hextets and wraps without changing characters", () => {
  for (const [input, expected] of [["2001:4860:4860::8888", "2001:4860:4860:0:**:**:**:**"], ["2606:4700:4700::1111", "2606:4700:4700:0:**:**:**:**"], ["2001:db8:abcd:1234:5678:9abc:def0:1234", "2001:db8:abcd:1234:**:**:**:**"], ["::1", "::**:**:**:**"]]) {
    const masked = maskIpAddress(input); assert.equal(masked, expected); assert.equal(ipDisplayParts(masked).join(""), masked);
  }
});
test("both protocols use only the two fixed HTTPS echoes without credentials, referrer or redirects", async () => {
  for (const family of ["ipv4", "ipv6"] as const) {
    const calls: string[] = [], address = family === "ipv4" ? "8.8.8.8" : "2001:4860:4860::8888";
    const result = await fetchProtocolEcho(family, new AbortController().signal, (async (url, init) => {
      calls.push(String(url)); assert.equal(init?.credentials, "omit"); assert.equal(init?.referrerPolicy, "no-referrer"); assert.equal(init?.redirect, "error"); assert.equal(init?.mode, "cors"); assert.equal(init?.headers, undefined);
      return echo(String(url), address);
    }) as typeof fetch);
    assert.ok(result.ok); assert.equal(result.data.address, address); assert.deepEqual(calls.sort(), Object.values(protocolEchoUrls[family]).sort());
  }
});
test("a refused ipify connection falls back to ident for IPv4 and IPv6", async () => {
  for (const family of ["ipv4", "ipv6"] as const) {
    const address = family === "ipv4" ? "8.8.8.8" : "2001:4860:4860::8888";
    const result = await fetchProtocolEcho(family, new AbortController().signal, (async url => { if (String(url).includes("ipify")) throw Error("connection refused"); return echo(String(url), address); }) as typeof fetch);
    assert.ok(result.ok); assert.equal(result.data.address, address);
  }
});
test("invalid JSON, wrong protocol, private and oversized responses never qualify as an IP", async () => {
  const bad = [() => Response.json({ ip: "8.8.8.8" }), () => Response.json({ ip: "::1" }), () => Response.json({ ip: "bad" }), () => Response.json({ ip: 6 }), () => new Response("not-json"), () => new Response("x".repeat(4097)), () => new Response("{}", { headers: { "Content-Length": "99999" } }), () => new Response(null, { status: 302 })];
  for (const make of bad) assert.equal((await fetchProtocolEcho("ipv6", new AbortController().signal, (async url => String(url).includes("ipify") ? make() : new Response("127.0.0.1")) as typeof fetch)).ok, false);
});
test("an invalid first response still allows a valid independent backup", async () => {
  const result = await fetchProtocolEcho("ipv4", new AbortController().signal, (async url => String(url).includes("ipify") ? Response.json({ ip: "::1" }) : new Response("8.8.8.8")) as typeof fetch);
  assert.ok(result.ok); assert.equal(result.data.address, "8.8.8.8");
});
test("all stalled echoes finish within one shared timeout window and abort both transports", async () => {
  let aborted = 0;
  const result = await fetchProtocolEcho("ipv6", new AbortController().signal, ((_url, init) => { init?.signal?.addEventListener("abort", () => aborted++); return new Promise(() => {}); }) as typeof fetch, 10);
  assert.deepEqual(result, { ok: false, code: "TIMEOUT" }); assert.equal(aborted, 2);
});
test("cancellation terminates even an uncooperative transport and starts no further requests", async () => {
  const abort = new AbortController(); let calls = 0;
  const result = fetchProtocolEcho("ipv4", abort.signal, (() => { calls++; return new Promise(() => {}); }) as typeof fetch);
  abort.abort(); assert.deepEqual(await result, { ok: false, code: "DETECTION_FAILED" }); assert.equal(calls, 2);
});
test("an already canceled detection starts zero first-party or external requests", async () => {
  const abort = new AbortController(); abort.abort(); let calls = 0;
  const transport = (() => { calls++; throw Error(); }) as typeof fetch;
  assert.equal((await fetchProtocolExit("ipv4", abort.signal, transport)).ok, false);
  assert.equal((await fetchProtocolEcho("ipv6", abort.signal, transport)).ok, false); assert.equal(calls, 0);
});
test("a successful site response survives both third-party failures", async () => {
  const result = await fetchProtocolExit("ipv4", new AbortController().signal, (async url => { if (String(url).includes("/api/connection")) return site("8.8.8.8"); throw Error(); }) as typeof fetch);
  assert.ok(result.ok); assert.equal(result.data.address, "8.8.8.8");
});
test("first valid protocol result is stable while slower different results remain comparison rows", async () => {
  let completeSite!: (r: Response) => void;
  const detector = createProtocolDetector("ipv4", (url => String(url).includes("/api/connection") ? new Promise<Response>(r => { completeSite = r; }) : Promise.resolve(echo(String(url), "9.9.9.9"))) as typeof fetch);
  const result = await detector.probe(new AbortController().signal); assert.ok(result.ok); assert.equal(result.data.address, "9.9.9.9");
  completeSite(site("8.8.8.8")); await tick();
  const row = detector.getSnapshot().site; assert.equal(row.phase, "done"); if (row.phase === "done") { assert.ok(row.outcome.ok); assert.equal(row.outcome.data.address, "8.8.8.8"); }
  assert.equal(result.data.address, "9.9.9.9");
});
test("a site connection using the other protocol is classified separately and never substitutes it", async () => {
  const detector = createProtocolDetector("ipv4", (async url => String(url).includes("/api/connection") ? site("2001:4860:4860::8888") : echo(String(url), "8.8.8.8")) as typeof fetch);
  const result = await detector.probe(new AbortController().signal); assert.ok(result.ok); assert.equal(result.data.family, "ipv4");
  const own = detector.getSnapshot().site; assert.equal(own.phase, "done"); if (own.phase === "done") { assert.equal(own.otherFamily, "ipv6"); assert.equal(own.outcome.ok, false); }
});
test("detected backup address is enriched through the existing application lookup", async () => {
  const detector = createProtocolDetector("ipv4", (async url => { if (String(url).includes("ident.me")) return new Response("8.8.8.8"); throw Error(); }) as typeof fetch); const lookups: string[] = [];
  const controller = createExitController({ probe: detector.probe, lookup: async address => { lookups.push(address); return { ok: true, data: ipInformationFixture(address) }; } });
  controller.refresh(); await tick(); assert.equal(controller.getSnapshot().phase, "ready"); assert.deepEqual(lookups, ["8.8.8.8"]); assert.equal(controller.getSnapshot().information?.organization, ipInformationFixture("8.8.8.8").organization); controller.dispose();
});
test("all rate-limited echoes retain the retryable rate-limit outcome", async () => {
  assert.deepEqual(await fetchProtocolEcho("ipv4", new AbortController().signal, (async () => new Response(null, { status: 429 })) as typeof fetch), { ok: false, code: "RATE_LIMITED" });
});
test("old-generation comparison replies cannot replace refreshed results", async () => {
  const pending: { url: string; resolve: (r: Response) => void }[] = [];
  const detector = createProtocolDetector("ipv4", (url => new Promise<Response>(resolve => pending.push({ url: String(url), resolve }))) as typeof fetch);
  const old = new AbortController(), first = detector.probe(old.signal); old.abort(); const second = detector.probe(new AbortController().signal);
  for (const item of pending.slice(3)) item.resolve(item.url.includes("/api/connection") ? site("9.9.9.9") : echo(item.url, "9.9.9.9"));
  assert.ok((await second).ok);
  for (const item of pending.slice(0, 3)) item.resolve(item.url.includes("/api/connection") ? site("8.8.8.8") : echo(item.url, "8.8.8.8"));
  await first; await tick();
  for (const row of Object.values(detector.getSnapshot())) { assert.equal(row.phase, "done"); if (row.phase === "done") { assert.ok(row.outcome.ok); assert.equal(row.outcome.data.address, "9.9.9.9"); } }
});
test("one unavailable family and its retry leave the other result intact", async () => {
  let v4Calls = 0, v6Calls = 0;
  const v4 = createExitController({ probe: async () => { v4Calls++; return { ok: true, data: { address: "8.8.8.8", family: "ipv4", detectedAt: "2026-11-16T00:00:00Z" } }; }, lookup: async address => ({ ok: true, data: ipInformationFixture(address) }) });
  const v6 = createExitController({ probe: async () => { v6Calls++; return { ok: false, code: "DETECTION_FAILED" }; }, lookup: async () => { throw Error("no detected address"); } });
  v4.refresh(); v6.refresh(); await tick(); v6.refresh(); await tick(); assert.equal(v4.getSnapshot().information?.address, "8.8.8.8"); assert.equal(v4Calls, 1); assert.equal(v6Calls, 2); v4.dispose(); v6.dispose();
});
test("a stalled response body times out and does not prevent a valid peer", async () => {
  const result = await fetchProtocolEcho("ipv6", new AbortController().signal, (async url => String(url).includes("ipify") ? new Response(new ReadableStream({ start() {} })) : new Response("2001:4860:4860::8888")) as typeof fetch, 10);
  assert.ok(result.ok); assert.equal(result.data.family, "ipv6"); await new Promise(r => setTimeout(r, 15));
});
test("text echoes reject HTML, JSON and multiple addresses instead of borrowing geography", async () => {
  for (const body of ["<html>8.8.8.8</html>", '{"ip":"8.8.8.8"}', "8.8.8.8\n9.9.9.9"]) assert.equal((await fetchProtocolEcho("ipv4", new AbortController().signal, (async url => String(url).includes("ipify") ? new Response("invalid") : new Response(body)) as typeof fetch)).ok, false);
});
