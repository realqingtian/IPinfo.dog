import { test } from "node:test";
import assert from "node:assert/strict";
import { demoAddresses, demoRecord, previewState, localizedName } from "../../src/features/ip/demo.ts";

test("empty initial preview has no invented lookup", () => {
  assert.deepEqual(previewState(""), { result: null, error: null });
});
test("only explicit documentation fixtures produce demo results", () => {
  for (const input of demoAddresses) {
    const value = previewState(` ${input} `);
    assert.equal(value.error, null);
    assert.equal(value.result?.datasetId, "interface-demo");
    assert.equal(value.result?.address, input);
  }
  assert.equal(previewState("1.1.1.1").error, "previewOnly");
});
test("private, reserved and invalid inputs never receive fake public details", () => {
  assert.equal(previewState("127.0.0.1").error, "nonPublicIp");
  assert.equal(previewState("192.0.2.99").error, "nonPublicIp");
  assert.equal(previewState("not-an-ip").error, "invalidIp");
  assert.equal(previewState("::ffff:127.0.0.1").error, "nonPublicIp");
});
test("locale formatting preserves unknown location, with English-only name fallback", () => {
  const ipv6 = demoRecord("ipv6");
  assert.equal(localizedName(ipv6.city, "zh-TW"), null);
  assert.equal(localizedName({ en: "Singapore" }, "zh-TW"), "Singapore");
  assert.notEqual(demoRecord("ipv4").geolocatedCountry?.code, demoRecord("ipv4").registeredCountry?.code);
});
