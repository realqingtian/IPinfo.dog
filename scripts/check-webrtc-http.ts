import assert from "node:assert/strict";
const base = process.env.IPINFO_BASE_URL ?? "https://ipinfo.dog";
const checks: string[] = [];
const check = (name: string, value: unknown) => { assert.ok(value, name); checks.push(name); };
for (const [locale, title] of [["zh-CN", "WebRTC 检测"], ["zh-TW", "WebRTC 檢測"], ["en", "WebRTC check"]]) {
  const response = await fetch(`${base}/webrtc`, { signal: AbortSignal.timeout(12_000), headers: { Cookie: `IPINFO_LOCALE=${locale}` } });
  const html = await response.text();
  check(`${locale}: localized page and response`, response.ok && html.includes(`<html lang="${locale}"`) && html.includes(title) && response.headers.get("Content-Language") === locale);
  check(`${locale}: private HTML`, /no-store/.test(response.headers.get("Cache-Control") ?? ""));
  check(`${locale}: manually started page and optional help`, html.includes('data-webrtc="manual"') && html.includes("data-detection-help") && html.includes('href="/webrtc"'));
  check(`${locale}: initial candidates empty`, !html.includes('data-ice-kind="'));
}
console.log(JSON.stringify({ passed: checks.length, failed: 0, checks, scope: "Page delivery only; native ICE and STUN require real browser validation" }, null, 2));
