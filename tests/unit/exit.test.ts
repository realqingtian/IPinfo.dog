import { test } from "node:test";
import assert from "node:assert/strict";
import { createExitHandler } from "../../src/server/http/exit-handler.ts";
import { createExitController, fetchExit, type BasicExit, type ProbeOutcome } from "../../src/features/ip/exit.ts";
import type { LookupOutcome } from "../../src/features/ip/query.ts";
import { ipInformationFixture as information } from "../fixtures/ip.ts";
const token = "unit-entry-token-".repeat(4);
const headers = { "X-IPinfo-Token": token, "X-IPinfo-Address": "8.8.8.8", "X-IPinfo-Family": "ipv4" };
const request = (extra: Record<string,string> = {}, url = "https://api.ipinfo.dog/api/connection", method = "GET") => new Request(url, { method, headers: { ...headers, ...extra } });
test("exit requires private entry authentication; arbitrary forwarding headers cannot substitute", async () => {
  const handle = createExitHandler({ token: async () => token });
  for (const supplied of ["", "forged", "é".repeat(token.length)]) {
    const r = await handle(request({ "X-IPinfo-Token": supplied, "CF-Connecting-IP": "1.1.1.1", "X-Forwarded-For": "1.1.1.1" }));
    assert.equal(r.status,403); assert.equal((await r.json()).ok,false);
  }
  const r = await handle(request({ "CF-Connecting-IP": "1.1.1.1", "X-Forwarded-For": "1.1.1.1" }));
  assert.equal((await r.json()).data.address,"8.8.8.8");
  assert.equal((await createExitHandler({ token: async () => null })(request())).status,503);
});
test("current connection accepts either family, requires public address, and rejects lookup targets", async () => {
  const handle = createExitHandler({ token: async () => token });
  for (const address of ["invalid", "127.0.0.1"]) assert.equal((await handle(request({ "X-IPinfo-Address": address }))).status,403);
  assert.equal((await handle(request({},"https://api.ipinfo.dog/api/connection?ip=1.1.1.1"))).status,400);
  assert.equal((await (await handle(request({ "X-IPinfo-Address":"2001:4860:4860::8888" }))).json()).data.family,"ipv6");
  const r=await handle(request({ "X-IPinfo-Address":"::ffff:8.8.8.8" }));assert.equal((await r.json()).data.address,"8.8.8.8");
});
test("probe CORS allows only the main site, has no credentials, and all content is no-store", async () => {
  const handle=createExitHandler({token:async()=>token});
  const allowed=await handle(request({Origin:"https://ipinfo.dog"}));assert.equal(allowed.headers.get("Access-Control-Allow-Origin"),"https://ipinfo.dog");assert.equal(allowed.headers.get("Access-Control-Allow-Credentials"),null);assert.match(allowed.headers.get("Cache-Control")!,/no-store/);
  for(const origin of ["https://evil.example","null","https://ipinfo.dog.evil.example"]){const r=await handle(request({Origin:origin}));assert.equal(r.status,403);assert.equal(r.headers.get("Access-Control-Allow-Origin"),null);}
  assert.equal((await handle(request({Origin:"https://ipinfo.dog","Access-Control-Request-Method":"GET"},undefined,"OPTIONS"))).status,204);
  assert.equal((await handle(request({Origin:"https://ipinfo.dog","Access-Control-Request-Method":"POST"},undefined,"OPTIONS"))).status,403);
  assert.equal((await handle(request({},undefined,"POST"))).status,405);
  assert.equal((await handle(request({},undefined,"HEAD"))).status,200);
});
test("address rate budget resets and a different actual address remains independent", async () => {
  let now=0;const handle=createExitHandler({token:async()=>token,now:()=>now,limit:2,maxAddresses:2});
  await handle(request());await handle(request());const r=await handle(request());assert.equal(r.status,429);assert.equal(r.headers.get("Retry-After"),"60");
  assert.equal((await handle(request({"X-IPinfo-Address":"1.1.1.1"}))).status,200);now=60_000;assert.equal((await handle(request())).status,200);
});
const basic=(address="8.8.8.8"):BasicExit=>({address,family:"ipv4",detectedAt:"2026-11-13T00:00:00Z"});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test("base IP publishes before details and survives unavailable data; retry only loads details",async()=>{
  let probes=0;const queries:((v:LookupOutcome)=>void)[]=[];
  const c=createExitController({probe:async()=>{probes++;return{ok:true,data:basic()};},lookup:()=>new Promise(resolve=>queries.push(resolve))});
  c.refresh();await tick();assert.equal(c.getSnapshot().basic?.address,"8.8.8.8");assert.equal(c.getSnapshot().phase,"details");
  queries[0]({ok:false,code:"DATA_UNAVAILABLE",retryable:true});await tick();assert.equal(c.getSnapshot().basic?.address,"8.8.8.8");
  c.retryDetails();queries[1]({ok:true,data:information("8.8.8.8")});await tick();assert.equal(probes,1);assert.equal(c.getSnapshot().phase,"ready");
});
test("refresh guards late probe and late details even when a transport ignores abort",async()=>{
  const probes:((v:ProbeOutcome)=>void)[]=[],queries:((v:LookupOutcome)=>void)[]=[];
  const c=createExitController({probe:()=>new Promise(resolve=>probes.push(resolve)),lookup:()=>new Promise(resolve=>queries.push(resolve))});
  c.refresh();probes[0]({ok:true,data:basic()});await tick();c.refresh();probes[1]({ok:true,data:basic("1.1.1.1")});await tick();
  queries[1]({ok:true,data:information("1.1.1.1")});queries[0]({ok:true,data:information("8.8.8.8")});await tick();assert.equal(c.getSnapshot().information?.address,"1.1.1.1");
  c.refresh();c.refresh();probes[2]({ok:true,data:basic()});probes[3]({ok:false,code:"DETECTION_FAILED"});await tick();assert.equal(c.getSnapshot().basic,null);
  c.dispose();
});
test("probe fetch validates actual family, response and public address without sending cookies",async()=>{
  const signal=new AbortController().signal;
  const transport:typeof fetch=async(_url,init)=>{assert.equal(init?.credentials,"omit");assert.equal(init?.cache,"no-store");return Response.json({ok:true,data:basic()});};
  assert.equal((await fetchExit("https://v4.example/api/exit","ipv4",signal,transport)).ok,true);
  assert.equal((await fetchExit("https://v6.example/api/exit","ipv6",signal,transport)).ok,false);
  assert.equal((await fetchExit("https://v4.example/api/exit","ipv4",signal,async()=>Response.json({ok:true,data:basic("127.0.0.1")}))).ok,false);
});
test("probe rejects broken transport, reports rate limit and has a finite waiting deadline",async()=>{
  const signal=new AbortController().signal;
  assert.deepEqual(await fetchExit("https://v4.example/api/exit","ipv4",signal,async()=>new Response("bad")),{ok:false,code:"DETECTION_FAILED"});
  assert.deepEqual(await fetchExit("https://v4.example/api/exit","ipv4",signal,async()=>new Response(null,{status:429})),{ok:false,code:"RATE_LIMITED"});
  assert.deepEqual(await fetchExit("https://v4.example/api/exit","ipv4",signal,()=>new Promise(()=>{}),5),{ok:false,code:"TIMEOUT"});
});
