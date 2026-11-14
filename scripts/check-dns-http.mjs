import assert from "node:assert/strict";
const base = process.env.IPINFO_BASE_URL ?? "http://127.0.0.1:3100", checks = [];
for (const [locale, title] of [["zh-CN", "DNS 查询"], ["zh-TW", "DNS 查詢"], ["en", "DNS lookup"]]) {
  const r = await fetch(base + "/dns", { headers: { Cookie: "IPINFO_LOCALE=" + locale }, signal: AbortSignal.timeout(15000) });
  assert.equal(r.status, 200); assert.equal(r.headers.get("content-language"), locale); assert.match(r.headers.get("cache-control"), /no-store/);
  const html = await r.text(), head = html.slice(0, html.indexOf("</head>"));
  assert.ok(head.includes(title)); assert.ok(head.includes(`/brand/share-cover-v7-${locale.toLowerCase()}.png`));
  assert.ok(html.includes('data-dns="lookup"')); assert.ok(!html.includes('data-dns-resolver="'));
  checks.push({ kind: "initial-page", locale, noAutomaticLookup: true });
}
for (const query of ["", "name=127.0.0.1&type=A&resolver=google", "name=https://example.com&type=A&resolver=google", "name=example.com&type=ANY&resolver=google", "name=example.com&type=A&resolver=bad", "name=example.com&type=A&resolver=google&url=http://internal", "name=example.com&type=A&resolver=google&name=other.com", "name=example.com&type=A&resolver=google&type=AAAA"]) {
  const r = await fetch(base + "/api/dns?" + query); assert.equal(r.status, 400); assert.equal((await r.json()).error, "INVALID_DNS");
  assert.match(r.headers.get("cache-control"), /no-store/); checks.push({ kind: "invalid-parameters", rejected: true });
}
const allSamples = { A: "example.com", AAAA: "example.com", CNAME: "www.github.com", MX: "gmail.com", TXT: "example.com", NS: "example.com", CAA: "google.com", HTTPS: "cloudflare.com" };
const samples = process.env.IPINFO_DNS_SMOKE_ONLY ? { A: "example.com" } : allSamples;
async function query(name, type, resolver, expected) {
  const r = await fetch(base + "/api/dns?" + new URLSearchParams({ name, type, resolver }), { signal: AbortSignal.timeout(10000) });
  assert.equal(r.status, 200, resolver + type); assert.match(r.headers.get("cache-control"), /no-store/); assert.equal(r.headers.get("access-control-allow-origin"), null);
  const body = await r.json(); assert.equal(body.ok, true); const d = body.data;
  assert.equal(d.resolver, resolver); assert.equal(d.type, type); assert.ok(Number.isInteger(d.elapsedMs));
  if (expected) assert.equal(d.status, expected, resolver + type + ":" + d.status);
  else { assert.ok(["ok", "empty", "nxdomain", "servfail", "refused", "dns-error"].includes(d.status)); assert.equal(d.name, "xn--fsqu00a.xn--fiqs8s"); }
  for (const record of d.records) { assert.equal(typeof record.data, "string"); assert.ok(Number.isInteger(record.ttl) && record.ttl >= 0); }
  if (expected === "ok") assert.ok(d.records.length > 0);
  checks.push({ kind: "real-resolver", name: d.name, type, resolver, status: d.status, records: d.records.length });
}
for (const [type, name] of Object.entries(samples)) for (const resolver of ["alidns", "cloudflare", "google"]) await query(name, type, resolver, "ok");
if (!process.env.IPINFO_DNS_SMOKE_ONLY) {
  for (const resolver of ["alidns", "cloudflare", "google"]) await query("dns-acceptance-no-such-host-20261114.ipinfo.dog", "A", resolver, "nxdomain");
  await query("例子.中国", "A", "google");
}
console.log(JSON.stringify({ passed: checks.length, checks, scope: "server public-resolver lookup, not visitor DNS leak detection" }, null, 2));
