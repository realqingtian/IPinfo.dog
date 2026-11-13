import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createTranslator } from "next-intl";
import { chooseLocale, locales } from "../../src/i18n/config.ts";

for (const [header, expected] of [
  ["zh-CN, en;q=0.8", "zh-CN"], ["zh-TW", "zh-TW"], ["zh-HK", "zh-TW"],
  ["zh-MO", "zh-TW"], ["zh-Hant", "zh-TW"], ["zh-Hans-TW", "zh-CN"],
  ["zh-SG", "zh-CN"], ["zh", "zh-CN"], ["en-GB", "en"], ["fr-FR", "en"],
  ["zh-TW;q=0.4, en;q=0.9", "en"], ["fr;q=1,zh-HK;q=0.8,en;q=0.7", "zh-TW"],
  ["zh-TW;q=0,en;q=0.2", "en"], ["zh-TW;q=bad,en", "en"],
  ["zh-TW;q=3,en", "en"], ["*", "en"], ["", "en"],
] as const) {
  test(`locale negotiation: ${header}`, () => assert.equal(chooseLocale(undefined, header), expected));
}
test("manual preference wins, invalid preference is ignored", () => {
  assert.equal(chooseLocale("zh-TW", "en-US"), "zh-TW");
  assert.equal(chooseLocale("../bad", "zh-CN"), "zh-CN");
  assert.equal(chooseLocale({ locale: "zh-CN" }, "en"), "en");
});
test("all three catalogs have identical keys and format without missing messages", async () => {
  let keys: string[] | undefined;
  for (const locale of locales) {
    const messages = JSON.parse(await readFile(new URL(`../../messages/${locale}.json`, import.meta.url), "utf8"));
    const currentKeys = Object.keys(messages.App).sort();
    if (keys) assert.deepEqual(currentKeys, keys);
    keys = currentKeys;
    const t = createTranslator({ locale, messages, namespace: "App", onError: (error) => { throw error; } });
    for (const key of currentKeys) assert.ok(t(key, { protocol: "IPv6", address: "1.1.1.1", seconds: 60, field: "ASN" }).length > 0);
  }
});
