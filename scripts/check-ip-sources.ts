import assert from "node:assert/strict";
const base = process.env.CHECK_BASE_URL ?? "http://127.0.0.1:3000";
const checks: { name: string; passed: boolean }[] = [];
async function check(name: string, run: () => Promise<void>) { try { await run(); checks.push({ name, passed: true }); } catch { checks.push({ name, passed: false }); } }
for (const ip of ["8.8.8.8", "2001:4860:4860::8888"]) await check(`MaxMind ${ip}`, async () => {
  const r = await fetch(`${base}/api/ip?${new URLSearchParams({ ip })}`); assert.equal(r.status, 200);
  const body = await r.json(); assert.equal(body.data.address, ip); assert.equal(body.data.sources.length, 3);
});
// Online suppliers must never be available through an application-side proxy.
for (const source of ["ipinfo", "dbip", "ip2location", "ipquery", "geojs", "https://evil.example"]) await check(`server proxy retired: ${source}`, async () => {
  assert.equal((await fetch(`${base}/api/ip/sources?${new URLSearchParams({ ip: "8.8.8.8", source })}`)).status, 404);
});
console.log(JSON.stringify({ checks, passed: checks.filter(c => c.passed).length, total: checks.length }, null, 2));
if (checks.some(c => !c.passed)) process.exitCode = 1;
