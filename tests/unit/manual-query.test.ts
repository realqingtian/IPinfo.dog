import { test } from "node:test";
import assert from "node:assert/strict";
import { createQueryController, readQuery, queryPath, queryTitle, type LookupOutcome } from "../../src/features/ip/query.ts";
import { createHistoryStore, cleanHistory, historyKey } from "../../src/features/ip/history.ts";
import { fetchIp } from "../../src/features/ip/client.ts";
import { attemptCopy } from "../../src/features/ip/clipboard.ts";
import { ipInformationFixture as result } from "../fixtures/ip.ts";
const tick = () => new Promise((resolve) => setImmediate(resolve));
const selection = (address: string) => readQuery(queryPath(address).split("?")[1]);
test("clipboard copies full originals and reports permission and resolver failures", async () => {
  const value = "2606:4700:abcd:1234:abcd:abcd:abcd:abcd"; let copied = "";
  assert.equal(await attemptCopy(value, async (text) => { copied = text; }), "success"); assert.equal(copied, value);
  assert.equal(await attemptCopy(() => "https://example.com/ip?ip=8.8.8.8", async (text) => { copied = text; }), "success"); assert.equal(copied, "https://example.com/ip?ip=8.8.8.8");
  assert.equal(await attemptCopy(value, async () => { throw new Error("permission denied"); }), "error");
  assert.equal(await attemptCopy(() => { throw new Error("not ready"); }, async () => {}), "error");
});
test("query URLs preserve one target, canonicalize mapped/IPv6 and never include preferences", () => {
  assert.equal(readQuery("").target, null);
  for (const value of ["ip=", "ip=1.1.1.1&ip=8.8.8.8", "ip=1.1.1.1&lang=en", "other=1"]) assert.equal(readQuery(value).error, "INVALID_IP");
  assert.equal(selection("::ffff:8.8.8.8").target, "8.8.8.8");
  assert.equal(selection("2001:4860:4860:0:0:0:0:8888").target, "2001:4860:4860::8888");
  assert.equal(selection("127.0.0.1").error, "NON_PUBLIC_IP");
  assert.equal(queryPath(" 8.8.8.8 "), "/ip?ip=8.8.8.8");
});
test("controller prevents late success/history, handles duplicate route effect and preserves draft", async () => {
  const pending: { resolve: (value: LookupOutcome) => void; signal: AbortSignal }[] = [], saved: string[] = [];
  const controller = createQueryController({ initial: readQuery(""), lookup: (_, signal) => new Promise((resolve) => pending.push({ resolve, signal })), onSuccess: (record) => saved.push(record.address) });
  controller.navigate(selection("1.1.1.1"), false, true); controller.navigate(selection("1.1.1.1")); assert.equal(pending.length, 1);
  controller.navigate(selection("8.8.8.8"), false, true); assert.equal(pending[0].signal.aborted, true);
  controller.setDraft("9.9.9.9"); pending[1].resolve({ ok: true, data: result("8.8.8.8") }); await tick();
  pending[0].resolve({ ok: true, data: result() }); await tick();
  assert.equal(controller.getSnapshot().result?.address, "8.8.8.8"); assert.equal(controller.getSnapshot().draft, "9.9.9.9");
  assert.deepEqual(saved, ["8.8.8.8"]);
});
test("late failure, dispose, back to empty, retry and invalid targets cannot leak previous state", async () => {
  const pending: ((value: LookupOutcome) => void)[] = [], saved: string[] = [];
  const controller = createQueryController({ initial: readQuery(""), lookup: () => new Promise((resolve) => pending.push(resolve)), onSuccess: (r) => saved.push(r.address) });
  controller.navigate(selection("1.1.1.1")); controller.navigate(selection("8.8.8.8"));
  pending[0]({ ok: false, code: "TIMEOUT", retryable: true }); await tick(); assert.equal(controller.getSnapshot().phase, "loading");
  pending[1]({ ok: false, code: "DATA_UNAVAILABLE", retryable: true }); await tick(); assert.equal(controller.getSnapshot().retryable, true);
  controller.navigate(selection("8.8.8.8"), true, true); pending[2]({ ok: true, data: result("8.8.8.8") }); await tick();
  controller.navigate(selection("127.0.0.1")); assert.equal(controller.getSnapshot().result, null); assert.equal(pending.length, 3);
  controller.navigate(readQuery("")); assert.equal(controller.getSnapshot().phase, "idle");
  controller.navigate(selection("1.1.1.1")); controller.dispose(); pending[3]({ ok: true, data: result() }); await tick();
  assert.deepEqual(saved, ["8.8.8.8"]);
});
test("URL reload/back restoration never recreates cleared manual history", async () => {
  const saved: string[] = [];
  const controller = createQueryController({ initial: selection("1.1.1.1"), lookup: async (address) => ({ ok: true, data: result(address) }), onSuccess: (r) => saved.push(r.address) });
  controller.navigate(selection("1.1.1.1")); await tick(); assert.equal(controller.getSnapshot().phase, "success"); assert.deepEqual(saved, []);
  controller.navigate(selection("8.8.8.8")); await tick(); assert.deepEqual(saved, []);
});
function memoryStorage() { const values = new Map<string, string>(); return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } }; }
test("history accepts successful public records only; caps, deduplicates, reorders and clears durably", () => {
  const storage = memoryStorage(), store = createHistoryStore(() => storage);
  for (let i = 1; i <= 12; i++) store.record(result(`8.8.8.${i}`));
  assert.equal(store.getSnapshot().items.length, 10); assert.equal(store.getSnapshot().items[0], "8.8.8.12");
  store.record(result("::ffff:8.8.8.8")); assert.equal(store.getSnapshot().items[0], "8.8.8.8"); assert.equal(store.getSnapshot().items.length, 10);
  store.record(result("203.0.113.24")); store.record(result("127.0.0.1")); store.record({ ...result(), sources: [] });
  store.record({ ...result(), sources: result().sources.map((source) => ({ ...source, found: false })) });
  assert.equal(store.getSnapshot().items[0], "8.8.8.8");
  store.clear(); const reloaded = createHistoryStore(() => storage); reloaded.load(); assert.deepEqual(reloaded.getSnapshot().items, []);
});
test("history tolerates corrupt/oversized/blocked storage and reports failed durable clear", () => {
  assert.deepEqual(cleanHistory(["::ffff:8.8.8.8", "8.8.8.8", "127.0.0.1", 3, "bad"]), ["8.8.8.8"]);
  const storage = memoryStorage(); storage.setItem(historyKey, "bad json"); const store = createHistoryStore(() => storage); store.load(); assert.deepEqual(store.getSnapshot().items, []);
  storage.setItem(historyKey, "x".repeat(9000)); store.load(); assert.deepEqual(store.getSnapshot().items, []);
  const blocked = createHistoryStore(() => { throw new Error("blocked"); }); blocked.load(); blocked.record(result()); assert.deepEqual(blocked.getSnapshot().items, ["1.1.1.1"]); assert.equal(blocked.getSnapshot().available, false);
  blocked.clear(); assert.equal(blocked.getSnapshot().clearFailed, true);
});
test("new history store reloads shared browser state without mixing language", () => {
  const storage = memoryStorage(), a = createHistoryStore(() => storage), b = createHistoryStore(() => storage);
  a.record(result()); b.load(); assert.deepEqual(b.getSnapshot().items, ["1.1.1.1"]);
  b.record(result("8.8.8.8")); a.load(); assert.deepEqual(a.getSnapshot().items, ["8.8.8.8", "1.1.1.1"]);
});
test("client validates successful response identity and malformed bodies", async () => {
  const signal = new AbortController().signal;
  const fake = (body: unknown, status = 200): typeof fetch => async () => Response.json(body, { status });
  assert.equal((await fetchIp("1.1.1.1", signal, fake({ ok: true, data: result() }))).ok, true);
  for (const body of [{ ok: true, data: result("8.8.8.8") }, { ok: true, data: { address: "1.1.1.1" } }, {}]) assert.deepEqual(await fetchIp("1.1.1.1", signal, fake(body)), { ok: false, code: "DATA_UNAVAILABLE", retryable: true });
  assert.equal((await fetchIp("1.1.1.1", signal, async () => new Response("bad html"))).ok, false);
});
test("client respects each public error category, handles network rejection and bounded timeout", async () => {
  const signal = new AbortController().signal;
  for (const [code, status] of [["INVALID_IP",400],["NON_PUBLIC_IP",422],["NO_RECORD",404],["DATA_UNAVAILABLE",503],["TIMEOUT",504],["RATE_LIMITED",429]] as const) {
    const response = await fetchIp("1.1.1.1", signal, async () => Response.json({ ok: false, error: { code } }, { status, headers: { "Retry-After": "20" } }));
    assert.equal(response.ok, false); if (!response.ok) { assert.equal(response.code, code); if(code==="RATE_LIMITED")assert.equal(response.retryAfter,20); }
  }
  assert.equal((await fetchIp("1.1.1.1", signal, async () => { throw new Error("network"); })).ok, false);
  const timeout = await fetchIp("1.1.1.1", signal, () => new Promise(() => {}), 5); assert.equal(timeout.ok, false); if (!timeout.ok) assert.equal(timeout.code,"TIMEOUT");
});

test("report titles identify validated query targets across locales", () => {
  assert.equal(queryTitle("IP 查询", selection("::ffff:8.8.8.8").target), "8.8.8.8 · IP 查询 · IPinfo.dog");
  assert.equal(queryTitle("IP Lookup", selection("invalid").target), "IP Lookup · IPinfo.dog");
});
