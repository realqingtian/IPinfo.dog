import { test } from "node:test";
import assert from "node:assert/strict";
import { parseIp } from "../../src/lib/ip.ts";

for (const input of ["1.1.1.1", " 8.8.8.8 ", "2606:4700:4700::1111", "2001:4860:4860:0:0:0:0:8888"]) {
  test(`public literal: ${input}`, () => assert.equal(parseIp(input).isPublic, true));
}
for (const input of ["", " ", "256.0.0.1", "1.1.1", "010.0.0.1", "2130706433", "0x7f000001", "https://1.1.1.1", "github.com", "1.1.1.1/24", "[::1]", "fe80::1%en0", "::ffff:010.0.0.1"]) {
  test(`reject non-literal: ${input}`, () => assert.throws(() => parseIp(input), /INVALID_IP/));
}
for (const input of ["127.0.0.1", "10.0.0.1", "100.64.0.1", "169.254.1.1", "192.0.2.1", "198.51.100.1", "203.0.113.1", "224.0.0.1", "::", "::1", "fc00::1", "fe80::1", "2001:db8::1", "ff02::1"]) {
  test(`non-public classification: ${input}`, () => assert.equal(parseIp(input).isPublic, false));
}
test("mapped IPv6 normalizes to IPv4 and retains its scope", () => {
  assert.equal(parseIp("::ffff:8.8.8.8").address, "8.8.8.8");
  assert.equal(parseIp("::ffff:127.0.0.1").isPublic, false);
});
test("equivalent IPv6 addresses canonicalize identically", () => {
  assert.equal(parseIp("2001:4860:4860:0:0:0:0:8888").address, "2001:4860:4860::8888");
});
