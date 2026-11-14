import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeDnsName, dnsTypes, dnsResolvers, dnsPath, type DnsResult, type DnsSelection, type ResolverId } from "../../src/features/dns/contracts.ts";
import { createDnsService, normalizeDnsResponse, parseDnsParameters } from "../../src/server/dns/service.ts";
import { createDnsHandler } from "../../src/server/dns/handler.ts";
import { createRequestBudget } from "../../src/server/http/ip-handler.ts";
import { createDnsController, readDnsQuery } from "../../src/features/dns/controller.ts";

const selection: DnsSelection = { name: "example.com", type: "A" };
const sample = (status = 0) => ({ Status: status, TC: false, Question: [{ name: "example.com.", type: 1 }], AD: false, Answer: status ? [] : [{ name: "example.com.", type: 1, TTL: 0, data: "192.0.2.1" }] });
const response = (body: unknown) => Response.json(body);
test("DNS input normalizes case, IDN and service labels", () => {
  assert.equal(normalizeDnsName(" Example.COM. "), "example.com");
  assert.equal(normalizeDnsName("例子.中国"), "xn--fsqu00a.xn--fiqs8s");
  assert.equal(normalizeDnsName("_dmarc.example.com"), "_dmarc.example.com");
});
test("DNS input rejects addresses, URLs, special zones, malformed and oversized names", () => {
  for (const name of ["", "localhost", "abc.local", "abc.invalid", "https://example.com", "user@example.com", "127.0.0.1", "127.1", "2130706433", "::1", "example.com:443", "example.com/path", "example.com?x=1", "example.com#x", "a..com", "-bad.com", "bad-.com", "a".repeat(64)+".com", "a.".repeat(130)+"com", "example.com%00", "a b.com", "example.com\\foo"]) assert.throws(() => normalizeDnsName(name), name);
});
test("DNS parameters reject duplicate, missing, arbitrary URL and unsupported selectors", () => {
  const good = "name=example.com&type=A&resolver=google";
  assert.deepEqual(parseDnsParameters(new URLSearchParams(good)), { ...selection, resolver: "google" });
  for (const query of [good+"&name=other.com", good+"&url=https://example.com", good.replace("type=A", "type=ANY"), good.replace("resolver=google", "resolver=127.0.0.1"), "name=example.com&type=A", good.replace("type=A", "type=toString")]) assert.throws(() => parseDnsParameters(new URLSearchParams(query)));
});
test("DNS response distinguishes empty, NXDOMAIN, SERVFAIL, refused and other RCODE", () => {
  assert.equal(normalizeDnsResponse(sample(), selection).status, "ok");
  assert.equal(normalizeDnsResponse({ ...sample(), Answer: undefined }, selection).status, "empty");
  for (const [code, status] of [[2,"servfail"],[3,"nxdomain"],[5,"refused"],[4,"dns-error"]]) assert.equal(normalizeDnsResponse(sample(code as number), selection).status, status);
  assert.equal(normalizeDnsResponse(sample(), selection).records[0].ttl, 0);
  assert.equal(normalizeDnsResponse(sample(), selection).authenticated, false);
});
test("DNS response accepts object Question, CNAME chains and multiline TXT as escaped plain text", () => {
  const body = sample();
  const d = normalizeDnsResponse({ ...body, Question: body.Question[0], Answer: [{ name: "example.com.", type: 5, TTL: 10, data: "target.example.com." }, { name: "target.example.com.", type: 16, TTL: 20, data: '<script>\nhello' }] }, selection);
  assert.equal(d.records.length, 2); assert.equal(d.records[1].data, '<script>\\u000ahello');
});
test("DNS schema validation rejects mismatched questions, truncation and malformed records", () => {
  for (const body of [{}, { ...sample(), Status: -1 }, { ...sample(), TC: true }, { ...sample(), Question: [{ name: "other.com", type: 1 }] }, { ...sample(), Question: [{ name: "example.com", type: 28 }] }, { ...sample(), Answer: [{ type: 1, TTL: -1, name: "x", data: "x" }] }, { ...sample(), Answer: Array(65).fill(sample().Answer[0]) }, { ...sample(), Answer: [{ ...sample().Answer[0], data: "x".repeat(8193) }] }]) assert.throws(() => normalizeDnsResponse(body, selection));
});
test("all eight types use fixed HTTPS endpoints, no credentials or visitor headers, and no answer fetch", async () => {
  const calls: URL[] = [];
  const service = createDnsService({ fetcher: async (input, init) => {
    const url = new URL(String(input)); calls.push(url);
    assert.equal(init?.redirect, "error"); assert.equal(init?.credentials, "omit"); assert.equal(init?.referrerPolicy, "no-referrer");
    assert.deepEqual(init?.headers, { Accept: "application/dns-json" });
    return response({ ...sample(), Question: [{ name: url.searchParams.get("name"), type: Number(url.searchParams.get("type")) }] });
  } });
  for (const type of Object.keys(dnsTypes) as (keyof typeof dnsTypes)[]) for (const r of dnsResolvers) assert.equal((await service({ ...selection, type }, r.id)).status, "ok");
  assert.equal(calls.length, 24);
  assert.deepEqual([...new Set(calls.map(x => x.origin))].sort(), ["https://cloudflare-dns.com","https://dns.alidns.com","https://dns.google"].sort());
  assert.ok(calls.filter(x=>x.hostname==='dns.google').every(x=>x.searchParams.get('edns_client_subnet')==='0.0.0.0/0'));
});
test("upstream HTTP, unreadable format and size limits do not escape into raw errors", async () => {
  for (const [fetcher, expected] of [
    [async () => new Response("limited", { status: 429 }), "limited"],
    [async () => new Response("upstream", { status: 503 }), "unavailable"],
    [async () => new Response("{}", { headers: { "content-type": "text/html" } }), "invalid-response"],
    [async () => new Response("{", { headers: { "content-type": "application/json" } }), "invalid-response"],
    [async () => response({ blob: "x".repeat(256) }), "invalid-response"],
  ] as const) assert.equal((await createDnsService({ fetcher, maxBytes: 128 })(selection, "google")).status, expected);
});
test("DNS timeout and cancellation release concurrency slots", async () => {
  let held = true;
  const service = createDnsService({ maxConcurrent: 1, timeoutMs: 20, fetcher: async (_input, init) => held ? new Promise<Response>((_yes, no) => { const signal=init!.signal!; signal.addEventListener('abort',()=>no(signal.reason),{once:true}); }) : response(sample()) });
  const pending = service(selection,"google");
  assert.equal((await service(selection,"cloudflare")).status,"limited");
  // Keep the test process alive while AbortSignal.timeout uses an unref timer.
  const keepAlive=setTimeout(()=>{},1000);
  try { assert.equal((await pending).status,"timeout"); held=false; assert.equal((await service(selection,"google")).status,"ok"); }
  finally {clearTimeout(keepAlive);}
  held=true; const abort=new AbortController(), next=service(selection,"google",abort.signal); abort.abort(); assert.equal((await next).status,"cancelled");
});
test("handler validates before lookup, redacts errors and enforces bounded global budget", async () => {
  let calls=0; const handler=createDnsHandler({ budget:createRequestBudget({limit:3}), lookup:async(s,r)=>{calls++;return {...s,resolver:r,status:'ok',records:[],elapsedMs:0};} });
  const url='https://ipinfo.dog/api/dns?name=example.com&type=A&resolver=google';
  assert.equal((await handler(new Request(url+'&url=http://internal'))).status,400); assert.equal(calls,0);
  const good=await handler(new Request(url,{headers:{Cookie:'secret',Authorization:'secret'}}));assert.equal(good.status,200);assert.match(good.headers.get('cache-control')!,/no-store/);assert.equal(good.headers.get('access-control-allow-origin'),null);assert.ok(!(await good.text()).includes('secret'));
  assert.equal((await handler(new Request(url.replace('resolver=google','resolver=bad')))).status,400);
  const limited=await handler(new Request(url)); assert.equal(limited.status,429);assert.ok(limited.headers.get('retry-after'));assert.equal(calls,1);
});
function fakeResult(s: DnsSelection,id: ResolverId): DnsResult {return {...s,resolver:id,status:'empty',records:[],elapsedMs:1};}
test("DNS links normalize IDN, retain type and reject malformed history selections",()=>{
  const d=readDnsQuery('name=%E4%BE%8B%E5%AD%90.%E4%B8%AD%E5%9B%BD&type=TXT');assert.equal(d.selection?.name,'xn--fsqu00a.xn--fiqs8s');assert.equal(d.selection?.type,'TXT');assert.equal(readDnsQuery(dnsPath(d.selection!).split('?')[1]).invalid,false);
  assert.equal(readDnsQuery('').selection,null);assert.equal(readDnsQuery('name=example.com&type=A&type=TXT').invalid,true);
});
test("DNS controller isolates retry/cancel/navigation, partial success and late failure",async()=>{
  const pending: {resolve:(d:DnsResult)=>void;reject:(e:Error)=>void;s:DnsSelection;id:ResolverId;signal:AbortSignal}[]=[];
  const c=createDnsController((s,id,signal)=>new Promise((resolve,reject)=>pending.push({resolve,reject,s,id,signal})));
  c.navigate('name=example.com&type=A');assert.equal(pending.length,3);c.navigate('name=example.com&type=A');assert.equal(pending.length,3);
  pending[0].resolve(fakeResult(selection,'alidns'));await Promise.resolve();await Promise.resolve();
  c.retry('google');assert.equal(pending.length,4);assert.equal(pending[2].signal.aborted,true);
  pending[2].reject(new Error('late')); pending[3].resolve(fakeResult(selection,'google'));await Promise.resolve();await Promise.resolve();
  assert.equal(c.getSnapshot().rows.google?.result?.status,'empty');
  c.cancel();assert.equal(c.getSnapshot().rows.alidns?.result?.status,'empty');assert.equal(c.getSnapshot().rows.cloudflare?.result?.status,'cancelled');
  pending[1].resolve(fakeResult(selection,'cloudflare'));await Promise.resolve();await Promise.resolve();assert.equal(c.getSnapshot().rows.cloudflare?.result?.status,'cancelled');
  c.navigate('name=cloudflare.com&type=HTTPS');c.dispose();pending.slice(4).forEach(p=>p.resolve(fakeResult(p.s,p.id)));await Promise.resolve();await Promise.resolve();assert.ok(Object.values(c.getSnapshot().rows).every(r=>r?.phase==='loading'));
});
