import assert from "node:assert/strict";
const base = process.env.CHECK_BASE_URL ?? "http://127.0.0.1:3000";
const checks: { name: string; passed: boolean }[] = [];
async function check(name: string, run: () => Promise<void>) { try { await run(); checks.push({ name, passed: true }); } catch { checks.push({ name, passed: false }); } }
for (const ip of ["8.8.8.8", "2001:4860:4860::8888"]) {
  await check(`MaxMind ${ip}`, async () => { const r = await fetch(`${base}/api/ip?${new URLSearchParams({ ip })}`); assert.equal(r.status, 200); const body = await r.json(); assert.equal(body.data.address, ip); assert.equal(body.data.sources.length, 3); });
  await check(`local IPinfo ${ip}`, async () => {
    const r = await fetch(`${base}/api/ip/sources?${new URLSearchParams({ ip, source: "ipinfo" })}`); assert.equal(r.status, 200);
    const body = await r.json(); assert.equal(body.data.address, ip); assert.equal(body.data.source, "ipinfo"); assert.equal(body.data.city, null);
    assert.equal(body.data.asn, 15169); assert.equal(body.data.domain, "google.com"); assert.equal(body.data.dataDates.length, 2); assert.equal(body.data.updateWarning, false);
  });
}
for (const source of ["dbip", "ip2location", "ipquery", "freeipapi", "ipdata", "iplocation", "ip125", "geojs", "https://evil.example"]) await check(`online proxy absent: ${source}`, async () => {
  assert.equal((await fetch(`${base}/api/ip/sources?${new URLSearchParams({ ip: "8.8.8.8", source })}`)).status, 404);
});
for (const [query, status] of [["source=ipinfo&ip=127.0.0.1", 422], ["source=ipinfo&ip=invalid", 400], ["source=ipinfo&ip=8.8.8.8&ip=1.1.1.1", 400]] as const) await check(`local boundary: ${query}`, async () => { assert.equal((await fetch(`${base}/api/ip/sources?${query}`)).status, status); });
console.log(JSON.stringify({ checks, passed: checks.filter(c => c.passed).length, total: checks.length }, null, 2));
if (checks.some(c => !c.passed)) process.exitCode = 1;
