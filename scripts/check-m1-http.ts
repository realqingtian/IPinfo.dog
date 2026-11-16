import assert from "node:assert/strict";
const base = process.env.IPINFO_BASE_URL ?? "http://127.0.0.1:3100";
const api = process.env.IPINFO_API_URL ?? base;
const origin = process.env.IPINFO_TEST_ORIGIN ?? "https://ipinfo.dog";
const split = process.env.IPINFO_SPLIT_HOSTS === "1";
const checks: { name: string; passed: boolean }[] = [];
async function check(name: string, run: () => Promise<void>) { await run(); checks.push({ name, passed: true }); }
for (const [input,status,code] of [["bad",400,"INVALID_IP"],["127.0.0.1",422,"NON_PUBLIC_IP"],["2001:db8::1",422,"NON_PUBLIC_IP"],["https://8.8.8.8",400,"INVALID_IP"],["8.8.8.0/24",400,"INVALID_IP"]] as const) {
  await check(`input:${input}`,async()=>{const r=await fetch(`${api}/api/ip?${new URLSearchParams({ip:input})}`);assert.equal(r.status,status);assert.equal((await r.json()).error.code,code);assert.match(r.headers.get("cache-control")!,/no-store/);});
}
for (const query of ["", "ip=8.8.8.8&ip=1.1.1.1", "ip=8.8.8.8&target=https://example.com"]) {
  await check(`parameters:${query}`,async()=>{assert.equal((await fetch(`${api}/api/ip?${query}`)).status,400);});
}
for (const input of ["8.8.8.8","2001:4860:4860::8888","::ffff:8.8.8.8"]) {
  await check(`facts:${input}`,async()=>{const r=await fetch(`${api}/api/ip?${new URLSearchParams({ip:input})}`,{headers:{Origin:origin}});assert.equal(r.status,200);const d=(await r.json()).data;assert.equal(d.address,input.startsWith("::ffff:")?"8.8.8.8":input);assert.equal(d.sources.length,3);assert.match(d.datasetId,/^[a-f0-9]{64}$/);assert.equal(r.headers.get("access-control-allow-origin"),origin);assert.equal(r.headers.get("access-control-allow-credentials"),null);});
}
for(const path of ["/api/ip?ip=8.8.8.8","/api/data-status"]) {
  await check(`cors:${path}`,async()=>{
    assert.equal((await fetch(api+path,{headers:{Origin:"https://evil.example"}})).status,403);
    const r=await fetch(api+path,{method:"OPTIONS",headers:{Origin:origin,"Access-Control-Request-Method":"GET"}});assert.equal(r.status,204);assert.equal(r.headers.get("access-control-allow-origin"),origin);
    assert.equal((await fetch(api+path,{method:"OPTIONS",headers:{Origin:origin,"Access-Control-Request-Method":"GET","Access-Control-Request-Headers":"Authorization"}})).status,403);
  });
}
for (const locale of ["zh-CN","zh-TW","en"]) for (const path of ["/","/ip?ip=8.8.8.8"]) {
  await check(`locale:${locale}:${path}`,async()=>{const r=await fetch(base+path,{headers:{Cookie:`IPINFO_LOCALE=${locale}`,"Accept-Language":"ja"}});assert.equal(r.status,200);const html=await r.text();assert.ok(html.includes(`lang="${locale}"`));assert.ok(html.includes('<meta name="description"'));assert.match(r.headers.get("cache-control")!,/no-store|private/);});
}
for (const [language,locale] of [["ja","en"],["zh-Hant-HK, en;q=0.8","zh-TW"],["zh-SG,en;q=0.8","zh-CN"]]) {
  await check(`language:${language}`,async()=>{const r=await fetch(base+"/",{headers:{"Accept-Language":language,Cookie:"IPINFO_LOCALE=invalid"}});assert.ok((await r.text()).includes(`lang="${locale}"`));});
}
for (const path of ["/api/health","/api/health/live","/api/data-status"]) {
  await check(path,async()=>{const r=await fetch(api+path,{headers:{Origin:origin}});assert.equal(r.status,200);assert.match(r.headers.get("cache-control")!,/no-store/);const b=await r.json();if(path.endsWith("data-status"))assert.equal(b.state,"current");});
}
for(const path of ["/ipv6","/routing","/webrtc","/environment","/dns","/unknown-page"]) await check(`removed:${path}`,async()=>{assert.equal((await fetch(base+path)).status,404);});
for(const path of ["/api/dns?name=example.com","/api/exit"]) await check(`removed-api:${path}`,async()=>{assert.equal((await fetch(api+path)).status,404);});
if(split) {
  for(const path of ["/api/ip?ip=8.8.8.8","/api/connection","/api/data-status"]) await check(`frontend-block:${path}`,async()=>{assert.equal((await fetch(base+path)).status,404);});
  for(const path of ["/","/ip?ip=8.8.8.8"]) await check(`api-block:${path}`,async()=>{assert.equal((await fetch(api+path)).status,404);});
  await check("trusted-current-connection",async()=>{
    const r=await fetch(api+"/api/connection",{headers:{Origin:origin,"X-IPinfo-Address":"8.8.8.8","X-IPinfo-Token":"forged","X-Forwarded-For":"1.1.1.1"}});assert.equal(r.status,200);
    const d=(await r.json()).data;assert.ok(["ipv4","ipv6"].includes(d.family));assert.ok(!["8.8.8.8","8.8.4.4","1.1.1.1"].includes(d.address));assert.equal(r.headers.get("access-control-allow-origin"),origin);
    assert.equal((await fetch(api+"/api/connection",{headers:{Origin:"https://evil.example"}})).status,403);
    const spoofed=await fetch(api+"/api/connection",{headers:{Origin:origin,"CF-Connecting-IP":"8.8.4.4"}});
    if(spoofed.status===200) assert.notEqual((await spoofed.json()).data.address,"8.8.4.4");
    else { assert.equal(spoofed.status,403); assert.equal(spoofed.headers.get("server"),"cloudflare"); }

  });
}
console.log(JSON.stringify({passed:true,checks:checks.length,results:checks},null,2));
