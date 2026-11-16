import { test } from "node:test";
import assert from "node:assert/strict";
import { localizedName } from "../../src/features/ip/presentation.ts";

test("locale formatting preserves missing names and falls back to English", () => {
  assert.equal(localizedName(null, "zh-TW"), null);
  assert.equal(localizedName(undefined, "en"), null);
  assert.equal(localizedName({}, "zh-CN"), null);
  assert.equal(localizedName({ en: "Singapore" }, "zh-TW"), "Singapore");
  assert.equal(localizedName({ en: "Singapore", "zh-CN": "新加坡" }, "zh-CN"), "新加坡");
  assert.equal(localizedName({ "zh-CN": "新加坡" }, "zh-TW"), null);
});
