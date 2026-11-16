import { test } from "node:test";
import assert from "node:assert/strict";
import { localizedName } from "../../src/features/ip/presentation.ts";
import { regionFlagCode } from "../../src/lib/region-flags.ts";
import { sourceDateLabel } from "../../src/features/ip/source-dates.ts";

test("locale formatting preserves missing names and falls back to English", () => {
  assert.equal(localizedName(null, "zh-TW"), null);
  assert.equal(localizedName(undefined, "en"), null);
  assert.equal(localizedName({}, "zh-CN"), null);
  assert.equal(localizedName({ en: "Singapore" }, "zh-TW"), "Singapore");
  assert.equal(localizedName({ en: "Singapore", "zh-CN": "新加坡" }, "zh-CN"), "新加坡");
  assert.equal(localizedName({ "zh-CN": "新加坡" }, "zh-TW"), null);
});

test("country and regional flags use supported ISO codes with a neutral fallback", () => {
  for (const code of ["CN", "US", "HK", "MO", "TW", "JP", "GB"]) assert.equal(regionFlagCode(code), code.toLowerCase());
  for (const code of [null, undefined, "", "US evil", "../CN", "ZZ"]) assert.equal(regionFlagCode(code), "xx");
});
test("compact source dates retain mixed-edition ranges without pretending online freshness", () => {
  assert.equal(sourceDateLabel({ dataDates: [] }), null);
  assert.equal(sourceDateLabel({ dataDates: [{ kind: "city", date: "2026-11-01T01:00:00Z" }, { kind: "asn", date: "2026-11-01T02:00:00Z" }] }), "2026-11-01");
  assert.equal(sourceDateLabel({ dataDates: [{ kind: "asn", date: "2026-11-13T00:00:00Z" }, { kind: "city", date: "2026-11-10T00:00:00Z" }] }), "2026-11-10–13");
});
