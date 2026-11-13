import { test } from "node:test";
import assert from "node:assert/strict";
import { createDiagnostics, diagnosticKeys, measureProbe, readiness, type DiagnosticKey, type DiagnosticOutcome } from "../../src/features/ipv6/diagnostics.ts";
import { fetchExit } from "../../src/features/ip/exit.ts";
import { createExitHandler } from "../../src/server/http/exit-handler.ts";

const tick = () => new Promise(resolve => setImmediate(resolve));
const success = (key: DiagnosticKey): DiagnosticOutcome => ({ ok: true, measurement: { data: { address: key === "ipv6" ? "2001:4860:4860::8888" : "8.8.8.8", family: key === "ipv6" ? "ipv6" : "ipv4", detectedAt: "2026-11-13T00:00:00Z" }, elapsedMs: 12 } });

test("readiness publishes independent results and does not classify a timeout as IPv4-only", async () => {
  let finish!: (value: DiagnosticOutcome) => void;
  const c = createDiagnostics({ measure: key => key === "ipv6" ? new Promise(resolve => { finish = resolve; }) : Promise.resolve(success(key)) });
  c.runAll(); await tick();
  assert.equal(c.getSnapshot().ipv4.phase, "success"); assert.equal(c.getSnapshot().ipv6.phase, "running");
  assert.equal(readiness(c.getSnapshot()), "v4Observed");
  finish({ ok: false, code: "TIMEOUT" }); await tick();
  assert.equal(c.getSnapshot().ipv6.error, "TIMEOUT"); assert.equal(readiness(c.getSnapshot()), "v4Observed");
  assert.equal(c.getSnapshot().connection.phase, "success");
});
test("readiness distinguishes IPv6 observed, both exits observed, and no confirmed exit", async () => {
  const c = createDiagnostics({ measure: async key => success(key) });
  assert.equal(readiness(c.getSnapshot()), "unconfirmed");
  c.run("ipv6"); await tick(); assert.equal(readiness(c.getSnapshot()), "v6Observed");
  c.run("ipv4"); await tick(); assert.equal(readiness(c.getSnapshot()), "dual");
});
test("single retry leaves successful neighbors intact; late success and late failure cannot win", async () => {
  const pending: ((value: DiagnosticOutcome) => void)[] = [];
  const c = createDiagnostics({ measure: key => key === "ipv6" ? new Promise(resolve => pending.push(resolve)) : Promise.resolve(success(key)) });
  c.runAll(); await tick(); const original = c.getSnapshot().ipv4;
  c.run("ipv6"); await tick(); pending[1](success("ipv6")); await tick();
  pending[0]({ ok: false, code: "TIMEOUT" }); await tick();
  assert.equal(c.getSnapshot().ipv6.phase, "success"); assert.equal(c.getSnapshot().ipv4, original);
});
test("cancel aborts pending probes and rejects ignored-abort late results, then rerun recovers", async () => {
  const pending: { key: DiagnosticKey; signal: AbortSignal; finish: (value: DiagnosticOutcome) => void }[] = [];
  const c = createDiagnostics({ measure: (key, signal) => new Promise(finish => pending.push({ key, signal, finish })) });
  c.runAll(); await tick(); c.cancel();
  for (const p of pending) { assert.equal(p.signal.aborted, true); p.finish(success(p.key)); }
  await tick(); for (const key of diagnosticKeys) assert.equal(c.getSnapshot()[key].phase, "cancelled");
  c.run("ipv4"); await tick(); pending[3].finish(success("ipv4")); await tick();
  assert.equal(c.getSnapshot().ipv4.phase, "success"); assert.equal(c.getSnapshot().ipv6.phase, "cancelled");
});
test("cancel preserves completed results; dispose prevents publications after navigation", async () => {
  let finish!: (value: DiagnosticOutcome) => void;
  const c = createDiagnostics({ measure: key => key === "ipv6" ? new Promise(resolve => { finish = resolve; }) : Promise.resolve(success(key)) });
  c.runAll(); await tick(); c.cancel(); assert.equal(c.getSnapshot().ipv4.phase, "success");
  c.run("ipv6"); await tick(); const before = c.getSnapshot(); c.dispose(); finish(success("ipv6")); await tick();
  assert.equal(c.getSnapshot(), before);
});
test("sync transport failure and rate limiting stay local; timing uses monotonic elapsed time", async () => {
  const c = createDiagnostics({ measure: key => { if (key === "ipv4") throw Error("transport"); return Promise.resolve({ ok: false, code: "RATE_LIMITED" }); } });
  c.runAll(); await tick(); assert.equal(c.getSnapshot().ipv4.error, "DETECTION_FAILED"); assert.equal(c.getSnapshot().ipv6.error, "RATE_LIMITED");
  let time = 10;
  const measured = await measureProbe("https://example/api/connection", "connection", new AbortController().signal, { clock: () => time, probe: async (_url, family) => { assert.equal(family, "any"); time = 52.7; const s = success("ipv4"); assert.ok(s.ok); return { ok: true, data: s.measurement.data }; } });
  assert.ok(measured.ok); assert.equal(measured.measurement.elapsedMs, 43);
});
test("automatic family validation accepts actual IPv6 but rejects inconsistent or nonpublic data", async () => {
  const data = { address: "2001:4860:4860::8888", family: "ipv6", detectedAt: "2026-11-13T00:00:00Z" };
  const transport = (payload: object): typeof fetch => async (_url, init) => { assert.equal(init?.credentials, "omit"); assert.equal(init?.cache, "no-store"); return Response.json({ ok: true, data: payload }); };
  const signal = new AbortController().signal;
  assert.equal((await fetchExit("/api/connection", "any", signal, transport(data))).ok, true);
  assert.equal((await fetchExit("/api/connection", "any", signal, transport({ ...data, family: "ipv4" }))).ok, false);
  assert.equal((await fetchExit("/api/connection", "any", signal, transport({ ...data, address: "::1" }))).ok, false);
  assert.equal((await fetchExit("/api/connection", "any", signal, () => new Promise(() => {}), 5)).ok, false);
});

const token = "private-connection-entry-".repeat(3);
const request = (headers: Record<string, string> = {}, query = "") => new Request(`https://ipinfo.dog/api/connection${query}`, { headers: { "X-IPinfo-Token": token, "X-IPinfo-Address": "2001:4860:4860::8888", "X-IPinfo-Family": "connection", ...headers } });
test("main-site protocol is inferred only from authenticated entry address, not client-supplied family or CF headers", async () => {
  const handle = createExitHandler({ token: async () => token, familyMode: "connection" });
  const r = await handle(request({ "CF-Connecting-IP": "1.1.1.1", "X-Forwarded-For": "1.1.1.1" }));
  assert.equal(r.status, 200); assert.equal((await r.json()).data.family, "ipv6"); assert.match(r.headers.get("Cache-Control")!, /no-store/);
  const invalid: Record<string, string>[] = [{ "X-IPinfo-Token": "forged" }, { "X-IPinfo-Family": "ipv4" }, { "X-IPinfo-Address": "240.1.2.3" }, { "X-IPinfo-Address": "" }];
  for (const headers of invalid) assert.equal((await handle(request(headers))).status, 403);
});
test("connection refuses arbitrary target and foreign origin; fixed-family exit still rejects connection mode", async () => {
  const handle = createExitHandler({ token: async () => token, familyMode: "connection" });
  assert.equal((await handle(request({}, "?ip=1.1.1.1"))).status, 400);
  const foreign = await handle(request({ Origin: "https://other.example" })); assert.equal(foreign.status, 403); assert.equal(foreign.headers.get("Access-Control-Allow-Origin"), null);
  assert.equal((await createExitHandler({ token: async () => token })(request())).status, 403);
});
