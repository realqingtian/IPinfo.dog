import assert from "node:assert/strict";
const base = process.env.CHECK_BASE_URL ?? "http://127.0.0.1:3000";
const checks: { name: string; passed: boolean }[] = [];
async function check(name: string, run: () => Promise<void>) { try { await run(); checks.push({ name, passed: true }); } catch { checks.push({ name, passed: false }); } }
for (const ip of ["8.8.8.8", "2001:4860:4860::8888"]) {
  await check(`MaxMind ${ip}`, async () => { const r = await fetch(`${base}/api/ip?${new URLSearchParams({ ip })}`); assert.equal(r.status, 200); const body = await r.json(); assert.equal(body.data.address, ip); assert.ok(body.data.sources.length === 3); });
  for (const source of ["dbip", "ipinfo"]) await check(`${source} ${ip}`, async () => {
    const r = await fetch(`${base}/api/ip/sources?${new URLSearchParams({ ip, source })}`, { headers: { Origin: process.env.CHECK_ORIGIN ?? "https://ipinfo.dog" } });
    assert.equal(r.status, 200); const body = await r.json(); assert.equal(body.ok, true); assert.equal(body.data.address, ip); assert.equal(body.data.source, source);
    assert.ok(body.data.asn > 0); assert.ok(body.data.country.code); assert.ok(Number.isFinite(Date.parse(body.data.queriedAt)));
    if (source === "ipinfo") { assert.equal(body.data.city, null); assert.deepEqual(body.data.dataDates, []); }
    else assert.equal(body.data.dataDates.length, 2);
    // The existing edge can append no-transform and combine duplicate cache directives.
    assert.match(r.headers.get("Cache-Control") ?? "", /(?:^|,)\s*private(?:,|$)/);
    assert.match(r.headers.get("Cache-Control") ?? "", /(?:^|,)\s*no-store(?:,|$)/);
  });
}
for (const [query, status] of [["ip=127.0.0.1&source=ipinfo", 422], ["ip=bad&source=dbip", 400], ["ip=8.8.8.8&source=https://example.com", 400], ["ip=8.8.8.8&source=ipinfo&key=x", 400]] as const) {
  await check(`reject ${query}`, async () => { assert.equal((await fetch(`${base}/api/ip/sources?${query}`)).status, status); });
}
await check("untrusted Origin rejected", async () => { assert.equal((await fetch(`${base}/api/ip/sources?ip=8.8.8.8&source=ipinfo`, { headers: { Origin: "https://untrusted.example" } })).status, 403); });
await check("CORS preflight", async () => { const r = await fetch(`${base}/api/ip/sources`, { method: "OPTIONS", headers: { Origin: process.env.CHECK_ORIGIN ?? "https://ipinfo.dog", "Access-Control-Request-Method": "GET" } }); assert.equal(r.status, 204); assert.equal(r.headers.get("Access-Control-Allow-Credentials"), null); });
console.log(JSON.stringify({ checks, passed: checks.filter(c => c.passed).length, total: checks.length }, null, 2));
if (checks.some(c => !c.passed)) process.exitCode = 1;
