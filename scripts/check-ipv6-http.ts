import assert from "node:assert/strict";
import { isIP } from "node:net";

const base = process.env.IPINFO_BASE_URL ?? "https://ipinfo.dog";
const checks: { name: string; passed: true }[] = [];
const request = (path: string, options: RequestInit = {}) => fetch(new URL(path, base), { ...options, signal: AbortSignal.timeout(12_000), headers: { "User-Agent": "IPinfoRuntimeCheck/1.0", ...options.headers } });
const check = (name: string, passed: unknown) => { assert.ok(passed, name); checks.push({ name, passed: true }); };
for (const [locale, title] of [["zh-CN", "IPv6 检测"], ["zh-TW", "IPv6 檢測"], ["en", "IPv6 check"]]) {
  const r = await request("/ipv6", { headers: { Cookie: `IPINFO_LOCALE=${locale}` } });
  const html = await r.text(); check(`${locale}: SSR title and lang`, r.status === 200 && html.includes(`<html lang="${locale}"`) && html.includes(title));
  check(`${locale}: private HTML and response language`, /no-store/.test(r.headers.get("Cache-Control") ?? "") && r.headers.get("Content-Language") === locale);
}
const knownExits: Record<string, string> = {};
for (const family of ["v4", "v6"]) {
  const root = `https://${family}.ipinfo.dog`, expected = family === "v4" ? "ipv4" : "ipv6";
  const r = await fetch(root + "/api/exit", { signal: AbortSignal.timeout(10_000), headers: { Origin: "https://ipinfo.dog" } }); const body = await r.json();
  check(`${family}: existing direct exit`, r.status === 200 && body.data.family === expected);
  knownExits[expected] = body.data.address;
  check(`${family}: connection route not exposed`, (await fetch(root + "/api/connection", { signal: AbortSignal.timeout(10_000) })).status === 404);
}
// Happy Eyeballs may select a different family on consecutive main-site requests.
const actualSource = (data: { address: string; family: string } | undefined) => data && knownExits[data.family] === data.address;
const normal = await request("/api/connection"); const payload = await normal.json();
check("trusted main connection is valid", normal.status === 200 && payload.ok && isIP(payload.data.address) && payload.data.family === (isIP(payload.data.address) === 6 ? "ipv6" : "ipv4") && actualSource(payload.data));
check("connection is never shared cache", /no-store/.test(normal.headers.get("Cache-Control") ?? "") && normal.headers.get("Access-Control-Allow-Credentials") === null);
const forged = { "X-IPinfo-Token": "forged", "X-IPinfo-Family": "ipv4", "X-IPinfo-Address": "1.1.1.1", "X-Forwarded-For": "1.1.1.1" };
const spoofed = await request("/api/connection", { headers: forged });
const spoofedPayload = spoofed.status === 200 ? await spoofed.json() : null;
check("entry overwrites client source and authentication headers", spoofed.status === 200 && actualSource(spoofedPayload.data));
const edgeSpoofed = await request("/api/connection", { headers: { ...forged, "CF-Connecting-IP": "1.1.1.1", "CF-Connecting-IPv6": "2001:4860:4860::8888" } });
check("forged Cloudflare headers rejected or preserve actual source", edgeSpoofed.status === 403 || (edgeSpoofed.status === 200 && actualSource((await edgeSpoofed.json()).data)));
check("query target rejected", (await request("/api/connection?ip=1.1.1.1")).status === 400);
const foreign = await request("/api/connection", { headers: { Origin: "https://other.example" } });
check("foreign origin rejected without CORS", foreign.status === 403 && foreign.headers.get("Access-Control-Allow-Origin") === null);
const head = await request("/api/connection", { method: "HEAD" }); check("HEAD has no body", head.status === 200 && (await head.text()) === "");
check("main exit remains closed", (await request("/api/exit")).status === 404);
console.log(JSON.stringify({ checks, passed: checks.length, failed: 0, visitorAddressesOmitted: true }, null, 2));
