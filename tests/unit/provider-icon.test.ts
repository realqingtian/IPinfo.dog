import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeProviderDomain, providerDomainForResult } from "../../src/lib/provider-domain.ts";
import { createProviderIconSource } from "../../src/server/provider-icon.ts";
import { createProviderIconHandler } from "../../src/server/http/provider-icon-handler.ts";
import { createRequestBudget } from "../../src/server/http/ip-handler.ts";
import type { SourceRecord } from "../../src/lib/contracts/ip-sources.ts";

function ico() {
  const bytes = Buffer.alloc(62); bytes.writeUInt16LE(1, 2); bytes.writeUInt16LE(1, 4);
  bytes[6] = 16; bytes[7] = 16; bytes.writeUInt32LE(40, 14); bytes.writeUInt32LE(22, 18); bytes.writeUInt32LE(40, 22);
  return bytes;
}
const response = () => new Response(ico(), { headers: { "Content-Type": "image/x-icon" } });
const record: SourceRecord = { address: "8.8.8.8", source: "ipinfo", country: null, city: null, asn: 15169, organization: "Google LLC", domain: "google.com", dataDates: [], queriedAt: "2026-11-16T00:00:00Z" };

test("provider icon requires an exact target and matching ASN, never guesses from a name", () => {
  const target = { address: "8.8.8.8", asn: 15169 };
  assert.equal(providerDomainForResult(target, record), "google.com");
  for (const other of [null, { ...record, address: "1.1.1.1" }, { ...record, asn: 13335 }, { ...record, source: "dbip" as const }, { ...record, domain: null }]) assert.equal(providerDomainForResult(target, other), null);
  assert.equal(providerDomainForResult({ address: target.address }, record), null);
});
test("domain normalization refuses URLs, ports, private / numeric targets and path injection", () => {
  assert.equal(normalizeProviderDomain(" BYTEVIRT.COM. "), "bytevirt.com");
  assert.equal(normalizeProviderDomain("xn--bcher-kva.de"), "xn--bcher-kva.de");
  for (const bad of [null, "", "localhost", "127.0.0.1", "[::1]", "https://google.com", "x.com:443", "u@x.com", "a.local", "a.internal", "a.invalid", "a.test", "a.example", "a.onion", "x.com/../", "x.com?ip=8.8.8.8", "x.com#x", "a%2fb.com", "-x.com", "x..com", "x.123", "x".repeat(64)+".com"]) assert.equal(normalizeProviderDomain(bad), null, String(bad));
});
test("icon source uses only the fixed service without credentials, redirects or caller metadata", async () => {
  let calls = 0;
  const lookup = createProviderIconSource({ transport: (async (url, init) => {
    calls++; assert.equal(String(url), "https://icons.duckduckgo.com/ip3/bytevirt.com.ico");
    assert.equal(init?.redirect, "error"); assert.equal(init?.credentials, "omit"); assert.equal(init?.referrerPolicy, "no-referrer");
    assert.deepEqual(Object.keys(init?.headers ?? {}), ["Accept"]); return response();
  }) as typeof fetch });
  assert.equal(await lookup("https://127.0.0.1"), null); assert.equal(calls, 0);
  assert.equal((await lookup("BYTEVIRT.COM"))?.type, "image/x-icon"); assert.equal(calls, 1);
});
test("icon cache coalesces requests, caches misses briefly and expires successful content", async () => {
  let time = 0, calls = 0, missing = false;
  const lookup = createProviderIconSource({ now: () => time, transport: (async () => { calls++; return missing ? new Response(null, { status: 404 }) : response(); }) as typeof fetch });
  const [a,b] = await Promise.all([lookup("google.com"),lookup("google.com")]); assert.ok(a && b); assert.equal(calls,1);
  time = 86_400_001; missing = true; assert.equal(await lookup("google.com"),null); assert.equal(calls,2);
  await lookup("google.com"); assert.equal(calls,2); time += 300_001; await lookup("google.com"); assert.equal(calls,3);
});
test("icons reject SVG / HTML, oversized streams, malformed ICO and unsafe dimensions", async () => {
  const badIco = ico(); badIco.writeUInt32LE(1000000,18);
  const png = Buffer.alloc(24); Buffer.from([137,80,78,71,13,10,26,10]).copy(png); png.writeUInt32BE(100000,16); png.writeUInt32BE(100000,20);
  for (const r of [new Response('<svg onload="x"/>',{headers:{'Content-Type':'image/svg+xml'}}),new Response('html',{headers:{'Content-Type':'image/x-icon'}}),new Response(badIco,{headers:{'Content-Type':'image/x-icon'}}),new Response(png,{headers:{'Content-Type':'image/png'}}),new Response(new Uint8Array(65537),{headers:{'Content-Type':'image/png'}}),new Response(ico(),{headers:{'Content-Type':'image/x-icon','Content-Length':'1000000'}}),new Response(null,{status:302,headers:{Location:'http://127.0.0.1'}})]) {
    assert.equal(await createProviderIconSource({transport:(async()=>r) as typeof fetch})("google.com"),null);
  }
});
test("icon timeout and concurrency limits fail quietly without blocking IP results", async () => {
  let calls = 0;
  const lookup = createProviderIconSource({timeoutMs:5,transport:(async()=>{calls++;return await new Promise<Response>(()=>{});}) as typeof fetch});
  const pending = ['a.com','b.com','c.com','d.com'].map(lookup);
  assert.equal(await lookup('e.com'),null); assert.equal(calls,4); assert.deepEqual(await Promise.all(pending),[null,null,null,null]);
});
test("icon HTTP handler permits only the main origin and a single valid domain, without forwarding headers", async () => {
  let calls=0; const handle=createProviderIconHandler({lookup:async domain=>{calls++;assert.equal(domain,'google.com');return {bytes:ico(),type:'image/x-icon'};}});
  const request=(query:string,init?:RequestInit)=>new Request(`https://api.ipinfo.dog/api/provider-icon?${query}`,init);
  for(const query of ['domain=127.0.0.1','domain=https://google.com','domain=google.com&ip=8.8.8.8','domain=google.com&domain=bytevirt.com']) assert.equal((await handle(request(query))).status,400);
  assert.equal((await handle(request('domain=google.com',{headers:{Origin:'https://evil.test'}}))).status,403);assert.equal(calls,0);
  const r=await handle(request('domain=google.com',{headers:{Origin:'https://ipinfo.dog',Cookie:'test=fictional'}}));assert.equal(r.status,200);assert.equal(r.headers.get('Content-Type'),'image/x-icon');assert.equal(r.headers.get('X-Content-Type-Options'),'nosniff');assert.equal(r.headers.get('Cross-Origin-Resource-Policy'),'same-site');assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://ipinfo.dog');assert.equal(calls,1);
});
test("icon HTTP errors are empty fallback responses; budget and methods remain bounded", async () => {
  const missing=createProviderIconHandler({lookup:async()=>{throw Error('private diagnostic');},budget:createRequestBudget({limit:1})});
  const req=()=>new Request('https://api.ipinfo.dog/api/provider-icon?domain=google.com');
  const r=await missing(req());assert.equal(r.status,204);assert.equal(await r.text(),'');assert.equal((await missing(req())).status,429);
  const handle=createProviderIconHandler({lookup:async()=>null});assert.equal((await handle(new Request(req(),{method:'POST'}))).status,405);
});
