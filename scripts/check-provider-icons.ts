import assert from "node:assert/strict";
const base = process.env.CHECK_BASE_URL ?? "http://127.0.0.1:3000";
const checks: { name: string; passed: boolean }[] = [];
async function check(name: string, operation: () => Promise<void>) { try { await operation(); checks.push({name,passed:true}); } catch { checks.push({name,passed:false}); } }
for (const domain of ["bytevirt.com", "google.com"]) await check(domain, async () => {
  const r=await fetch(`${base}/api/provider-icon?${new URLSearchParams({domain})}`,{signal:AbortSignal.timeout(10000)});
  assert.equal(r.status,200);assert.ok(["image/x-icon","image/png"].includes(r.headers.get("Content-Type")??""));
  const b=new Uint8Array(await r.arrayBuffer());assert.ok(b.length>24&&b.length<=65536);assert.equal(r.headers.get("X-Content-Type-Options"),"nosniff");
});
for(const query of ["domain=127.0.0.1","domain=https://google.com","domain=google.com&domain=bytevirt.com","domain=google.com&ip=8.8.8.8"])await check(query,async()=>{assert.equal((await fetch(`${base}/api/provider-icon?${query}`)).status,400);});
await check('untrusted Origin',async()=>{assert.equal((await fetch(`${base}/api/provider-icon?domain=google.com`,{headers:{Origin:'https://evil.test'}})).status,403);});
console.log(JSON.stringify({passed:checks.filter(x=>x.passed).length,total:checks.length,checks},null,2));
if(checks.some(x=>!x.passed))process.exitCode=1;
