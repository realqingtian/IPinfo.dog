import { test } from "node:test";
import assert from "node:assert/strict";
import { readIp138Echo } from "../../src/features/ip/ip138.ts";
import { fetchIp138Exit, ipipRow } from "../../src/features/ip/protocol-probe.ts";

const page = (ip = "8.8.8.8", place = "中国 广东 广州 番禺 电信") => `<!DOCTYPE html><html><body><div class="view"><span>您的iP地址是：</span><span>[<a href="https://www.ip138.com/iplookup.php?ip=${ip}&amp;action=2" target="_blank">${ip}</a>]</span><span>来自：${place}</span></div></body></html>`;
test("IP138 reads only its explicit address and native country/city without executing HTML", () => {
  const row = readIp138Echo(page() + '<script>throw Error("must never run")</script>');
  assert.equal(row.address, "8.8.8.8"); assert.equal(row.location?.country?.code, "CN");
  assert.equal(row.location?.city?.en, "广州"); assert.equal(row.location?.asn, null);
  assert.equal(readIp138Echo(page("8.8.8.8", "美国")).location?.city, null);
});
test("IP138 rejects mismatched, private and unexpected markup rather than taking unrelated IP text", () => {
  for (const html of [page().replace('>8.8.8.8</a>', '>1.1.1.1</a>'), page("127.0.0.1"), '<img src="https://example.com/8.8.8.8.gif">', page().replace('www.ip138.com', 'evil.example')]) assert.throws(() => readIp138Echo(html));
});
test("IP138 makes one fixed credential-free CORS request and preserves the actual protocol", async () => {
  for (const [address, family, other] of [["8.8.8.8", "ipv4", "ipv6"], ["2001:4860:4860::8888", "ipv6", "ipv4"]] as const) {
    let calls = 0;
    const outcome = await fetchIp138Exit(new AbortController().signal, async (url, init) => {
      calls++; assert.equal(url, "https://2026.ip138.com/");
      assert.equal(init?.mode, "cors"); assert.equal(init?.credentials, "omit");
      assert.equal(init?.redirect, "error"); assert.equal(init?.referrerPolicy, "no-referrer");
      return new Response(page(address));
    });
    assert.ok(outcome.ok); assert.equal(outcome.data.family, family); assert.equal(calls, 1);
    assert.equal(ipipRow(other, outcome).phase, "done");
    assert.deepEqual(ipipRow(other, outcome), { phase: "done", outcome: { ok: false, code: "DETECTION_FAILED" }, otherFamily: family });
  }
});
test("IP138 rejects oversized markup, handles failures and starts no canceled request", async () => {
  for (const response of [new Response(page() + "x".repeat(4096)), new Response('invalid'), new Response(null, { status: 503 })]) assert.equal((await fetchIp138Exit(new AbortController().signal, async () => response)).ok, false);
  const abort = new AbortController(); abort.abort(); let calls = 0;
  assert.equal((await fetchIp138Exit(abort.signal, async () => { calls++; return new Response(page()); })).ok, false);
  assert.equal(calls, 0);
});
