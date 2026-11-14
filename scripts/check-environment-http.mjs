import assert from "node:assert/strict";

const base = process.env.IPINFO_BASE_URL ?? "http://127.0.0.1:3100";
const titles = { "zh-CN": "浏览器环境", "zh-TW": "瀏覽器環境", en: "Browser environment" };
const checks = [];
async function check(locale, cookie = `IPINFO_LOCALE=${locale}`, language = "ja") {
  const response = await fetch(`${base}/environment`, {
    headers: { Cookie: `${cookie}; PRIVATE_TEST=not-for-output-4f283`, "Accept-Language": language,
      "User-Agent": "IPinfo-environment-acceptance", Authorization: "Bearer not-for-output-6b772",
      "X-Private-Test": "not-for-output-8d901", "Sec-CH-UA-Platform": '"Acceptance"' },
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-language"), locale);
  assert.match(response.headers.get("cache-control"), /private/);
  assert.match(response.headers.get("cache-control"), /no-store/);
  const html = await response.text(), head = html.slice(0, html.indexOf("</head>"));
  assert.ok(html.includes(`lang="${locale}"`));
  assert.ok(head.includes(`${titles[locale]} · IPinfo.dog`));
  assert.ok(head.includes(`/brand/share-cover-v7-${locale.toLowerCase()}.png`));
  assert.ok(html.includes('data-environment="manual"'));
  assert.ok(!html.includes('data-environment-field="'));
  assert.ok(html.includes("IPinfo-environment-acceptance"));
  assert.ok(html.includes("Acceptance"));
  for (const sentinel of ["not-for-output-4f283", "not-for-output-6b772", "not-for-output-8d901"]) assert.ok(!html.includes(sentinel));
  checks.push({ locale, manualInitialState: true, privateCache: true, localizedMetadata: true, headerAllowlist: true });
}
for (const locale of Object.keys(titles)) await check(locale);
await check("en", "IPINFO_LOCALE=invalid", "ja");
await check("zh-TW", "", "zh-Hant-HK,en;q=0.8");
await check("zh-CN", "", "zh-SG,en;q=0.8");
await Promise.all(["en", "zh-CN", "zh-TW", "en", "zh-TW", "zh-CN"].map(locale => check(locale)));
console.log(JSON.stringify({ totalChecks: checks.length, checks, nativeDeviceValidation: false }, null, 2));
