import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchProtocolEcho, fetchProtocolExit, protocolEchoUrls } from "../../src/features/ip/protocol-probe.ts";
import { createExitController } from "../../src/features/ip/exit.ts";
import { maskIpAddress, ipDisplayParts } from "../../src/features/ip/presentation.ts";
import { ipInformationFixture } from "../fixtures/ip.ts";

test("IPv4 hides exactly the final two octets, including one-digit and mapped addresses", () => {
  for (const [input, expected] of [["8.8.8.8","8.8.••.••"],["123.45.67.89","123.45.••.••"],["::ffff:8.8.8.8","8.8.••.••"]]) assert.equal(maskIpAddress(input),expected);
});
test("IPv6 masks four expanded hextets, preserves compression and wraps without changing characters", () => {
  for(const [input,expected]of [["2001:4860:4860::8888","2001:4860:4860:0:••:••:••:••"],["2606:4700:4700::1111","2606:4700:4700:0:••:••:••:••"],["2001:db8:abcd:1234:5678:9abc:def0:1234","2001:db8:abcd:1234:••:••:••:••"],["::1","::••:••:••:••"]]){
    const masked=maskIpAddress(input);assert.equal(masked,expected);assert.equal(ipDisplayParts(masked).join(""),masked);assert.notEqual(input,masked);
  }
});
test("protocol echo uses only fixed family HTTPS targets, no credentials, referrer or redirects",async()=>{
  for(const family of ["ipv4","ipv6"]as const){const ip=family==="ipv4"?"8.8.8.8":"2001:4860:4860::8888";
    const result=await fetchProtocolEcho(family,new AbortController().signal,(async(url,init)=>{assert.equal(String(url),protocolEchoUrls[family]);assert.equal(init?.credentials,"omit");assert.equal(init?.referrerPolicy,"no-referrer");assert.equal(init?.redirect,"error");assert.equal(init?.mode,"cors");assert.equal(init?.headers,undefined);return Response.json({ip});})as typeof fetch);
    assert.ok(result.ok);assert.equal(result.data.address,ip);assert.equal(result.data.family,family);
  }
});
test("wrong-family, private, invalid and oversized echo bodies never become a detected address",async()=>{
  for(const r of [Response.json({ip:"8.8.8.8"}),Response.json({ip:"::1"}),Response.json({ip:"bad"}),Response.json({ip:6}),new Response('not-json'),new Response('x'.repeat(4097)),new Response('{}',{headers:{'Content-Length':'1000000'}}),new Response(null,{status:302})])assert.equal((await fetchProtocolEcho('ipv6',new AbortController().signal,(async()=>r)as typeof fetch)).ok,false);
});
test("echo timeout, cancellation and rate limits terminate without inventing IPv6 support",async()=>{
  const signal=new AbortController().signal;
  assert.deepEqual(await fetchProtocolEcho('ipv6',signal,()=>new Promise(()=>{}),5),{ok:false,code:'TIMEOUT'});
  assert.deepEqual(await fetchProtocolEcho('ipv6',signal,(async()=>new Response(null,{status:429}))as typeof fetch),{ok:false,code:'RATE_LIMITED'});
  const aborted=new AbortController();aborted.abort();let calls=0;const result=await fetchProtocolEcho('ipv6',aborted.signal,(async()=>{calls++;throw Error();})as typeof fetch);assert.equal(result.ok,false);assert.equal(calls,0);
});
test("matching authenticated connection wins; only its missing family calls the public echo",async()=>{
  let calls:string[]=[];
  const transport=(async(url)=>{calls.push(String(url));return String(url).includes('/api/connection')?Response.json({ok:true,data:{address:'8.8.8.8',family:'ipv4',detectedAt:'2026-11-16T00:00:00Z'}}):Response.json({ip:'2001:4860:4860::8888'});})as typeof fetch;
  assert.ok((await fetchProtocolExit('ipv4',new AbortController().signal,transport)).ok);assert.equal(calls.length,1);assert.ok(calls[0].endsWith('/api/connection'));
  calls=[];const v6=await fetchProtocolExit('ipv6',new AbortController().signal,transport);assert.ok(v6.ok);assert.equal(v6.data.family,'ipv6');assert.deepEqual(calls.slice(1),[protocolEchoUrls.ipv6]);
});
test("failed entry can fall back, but an aborted request never starts another endpoint",async()=>{
  const aborted=new AbortController();let calls=0;
  const transport=(async()=>{calls++;aborted.abort();return new Response(null,{status:503});})as typeof fetch;
  assert.equal((await fetchProtocolExit('ipv4',aborted.signal,transport)).ok,false);assert.equal(calls,1);
  const other=(async(url)=>String(url).includes('/api/connection')?new Response(null,{status:503}):Response.json({ip:'8.8.8.8'}))as typeof fetch;
  assert.ok((await fetchProtocolExit('ipv4',new AbortController().signal,other)).ok);
});
test("one unavailable family and its retry leave the successful protocol result intact",async()=>{
  let v4Calls=0,v6Calls=0;
  const v4=createExitController({probe:async()=>{v4Calls++;return{ok:true,data:{address:'8.8.8.8',family:'ipv4',detectedAt:'2026-11-16T00:00:00Z'}};},lookup:async address=>({ok:true,data:ipInformationFixture(address)})});
  const v6=createExitController({probe:async()=>{v6Calls++;return{ok:false,code:'DETECTION_FAILED'};},lookup:async()=>{throw Error('must not query an undetected IP');}});
  v4.refresh();v6.refresh();await new Promise(r=>setImmediate(r));assert.equal(v4.getSnapshot().phase,'ready');assert.equal(v6.getSnapshot().phase,'error');
  v6.refresh();await new Promise(r=>setImmediate(r));assert.equal(v4.getSnapshot().information?.address,'8.8.8.8');assert.equal(v4Calls,1);assert.equal(v6Calls,2);v4.dispose();v6.dispose();
});
