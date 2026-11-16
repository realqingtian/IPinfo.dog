import assert from "node:assert/strict";
const base = process.env.CHECK_BASE_URL ?? "http://127.0.0.1:3000";
const checks: { name: string; passed: boolean }[] = [];
for (const domain of ["google.com", "bytevirt.com", "127.0.0.1"]) {
  const passed = (await fetch(`${base}/api/provider-icon?${new URLSearchParams({ domain })}`)).status === 404;
  checks.push({ name: `server icon proxy retired: ${domain}`, passed });
}
assert.ok(checks.every(c => c.passed));
console.log(JSON.stringify({ passed: checks.length, total: checks.length, checks }, null, 2));
