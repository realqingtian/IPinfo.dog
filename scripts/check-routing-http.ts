import assert from "node:assert/strict";

const base = process.env.IPINFO_BASE_URL ?? "https://ipinfo.dog";
const checks: { name: string; passed: true }[] = [];
const check = (name: string, value: unknown) => { assert.ok(value, name); checks.push({ name, passed: true }); };
for (const [locale, title] of [["zh-CN", "分流检测"], ["zh-TW", "分流檢測"], ["en", "Routing check"]]) {
  const response = await fetch(`${base}/routing`, { signal: AbortSignal.timeout(12_000), headers: { Cookie: `IPINFO_LOCALE=${locale}`, "User-Agent": "IPinfoRuntimeCheck/1.0" } });
  const html = await response.text();
  check(`${locale}: localized SSR title and language`, response.status === 200 && html.includes(`<html lang="${locale}"`) && html.includes(title) && response.headers.get("Content-Language") === locale);
  check(`${locale}: no shared HTML cache`, /no-store/.test(response.headers.get("Cache-Control") ?? ""));
  check(`${locale}: 34 targets rendered before checks start`, (html.match(/data-target="/g) ?? []).length === 34 && html.includes('href="/routing"'));
  check(`${locale}: no production fixture endpoints`, !html.includes("Controlled test data") && !html.includes("受控测试数据") && !html.includes("受控測試資料") && !html.includes("http://127.0.0.1"));
}
check("no arbitrary-target backend proxy", (await fetch(`${base}/api/routing?url=https://example.invalid`, { signal: AbortSignal.timeout(10_000) })).status === 404);
console.log(JSON.stringify({ passed: checks.length, failed: 0, checks, scope: "HTTP verifies page delivery only; third-party CORS and client exits require actual browser checks" }, null, 2));
