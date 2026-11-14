import { test } from "node:test";
import assert from "node:assert/strict";
import { readValue, requestView, requestHeaderNames, primaryLanguage, compareEnvironment, createEnvironmentController, type EnvironmentValues } from "../../src/features/environment/environment.ts";
import { collectEnvironment } from "../../src/features/environment/browser.ts";

test("environment field reads isolate failure and preserve zero and false", () => {
  assert.equal(readValue(() => 0), 0);
  assert.equal(readValue(() => false), false);
  assert.equal(readValue(() => { throw new Error("denied"); }), null);
  for (const value of [undefined, {}, Infinity, NaN, "  "]) assert.equal(readValue(() => value), null);
  assert.equal(readValue(() => "a\n\tb\0c"), "a b c");
  assert.equal((readValue(() => "a".repeat(2000)) as string).length, 1024);
});
test("request projection reads exactly the allowlist, bounds values and omits secrets", () => {
  const read: string[] = [];
  const result = requestView({ get(key) { read.push(key); if (key === "sec-ch-ua") throw new Error("hidden"); return key === "user-agent" ? "x".repeat(3000) : "en-US"; } });
  assert.deepEqual(read, [...requestHeaderNames]);
  assert.deepEqual(Object.keys(result), [...requestHeaderNames]);
  assert.equal(result["user-agent"]?.length, 1024);
  assert.equal(result["sec-ch-ua"], null);
  assert.ok(!("cookie" in result) && !("authorization" in result) && !("x-forwarded-for" in result));
});
test("request language comparison respects quality, zero and invalid tags", () => {
  assert.equal(primaryLanguage("en;q=0.2, zh-TW;q=0.9"), "zh-tw");
  assert.equal(primaryLanguage("en;q=0, zh-CN;q=bad, *;q=1, fr;q=2, de;q=0.5"), "de");
  assert.equal(primaryLanguage(null), null);
  const headers = requestView(new Headers({ "user-agent": "Browser", "accept-language": "en-US,en;q=0.8" }));
  assert.deepEqual(compareEnvironment({ userAgent: "Browser", language: "en-us" }, headers), { userAgent: "matching", language: "matching" });
  assert.deepEqual(compareEnvironment({ userAgent: "Other", language: "en-GB" }, headers), { userAgent: "different", language: "different" });
  assert.deepEqual(compareEnvironment({}, headers), { userAgent: "unconfirmed", language: "unconfirmed" });
  assert.equal(compareEnvironment({ userAgent: "x".repeat(2000) }, requestView(new Headers({ "user-agent": "x".repeat(2000) }))).userAgent, "unconfirmed");
});
function deferred() {
  let resolve!: (value: EnvironmentValues) => void, reject!: (reason: Error) => void;
  const promise = new Promise<EnvironmentValues>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
test("clear invalidates a pending read, including its late rejection", async () => {
  for (const failure of [false, true]) {
    const pending = deferred(), controller = createEnvironmentController(() => pending.promise);
    const run = controller.run(); assert.equal(controller.getSnapshot().phase, "running");
    controller.clear();
    if (failure) pending.reject(new Error("late")); else pending.resolve({ language: "en" });
    await run; assert.deepEqual(controller.getSnapshot(), { phase: "idle", values: {} });
  }
});
test("only the newest check can publish, subscriber cleanup and rerun work", async () => {
  const first = deferred(), second = deferred(); let count = 0, notifications = 0;
  const controller = createEnvironmentController(() => (++count === 1 ? first : second).promise);
  const unsubscribe = controller.subscribe(() => notifications++);
  const older = controller.run(), newer = controller.run();
  second.resolve({ language: "zh-CN" }); await newer;
  first.resolve({ language: "en" }); await older;
  assert.equal(controller.getSnapshot().values.language, "zh-CN");
  assert.equal(notifications, 3);
  unsubscribe(); controller.clear(); assert.equal(notifications, 3);
  assert.equal(controller.getServerSnapshot().phase, "idle");
});
test("a rejected active check is retryable", async () => {
  let first = true;
  const controller = createEnvironmentController(async () => { if (first) { first = false; throw new Error("denied"); } return { touchPoints: 0 }; });
  await controller.run(); assert.equal(controller.getSnapshot().phase, "error");
  await controller.run(); assert.equal(controller.getSnapshot().phase, "complete");
  assert.equal(controller.getSnapshot().values.touchPoints, 0);
});
test("restricted graphics and a throwing field leave other browser values available", async () => {
  const names = ["navigator", "screen", "window", "document", "matchMedia"];
  const originals = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  try {
    const navigator = { language: "en-US", languages: ["en-US"], maxTouchPoints: 0, webdriver: false, get platform() { throw new Error("hidden"); } };
    const contexts: string[] = [];
    const mocks = { navigator, screen: { width: 390, height: 844, availWidth: 390, availHeight: 800, colorDepth: 24 }, window: { innerWidth: 390, innerHeight: 700, devicePixelRatio: 3 }, matchMedia: () => ({ matches: false }), document: { createElement() { return { getContext(name: string) { contexts.push(name); if (name === "2d") return { fillRect() {}, fillText() {}, getImageData() { throw new Error("readback denied"); } }; return null; } }; } } };
    for (const [name, value] of Object.entries(mocks)) Object.defineProperty(globalThis, name, { configurable: true, value });
    const result = await collectEnvironment();
    assert.equal(result.language, "en-US"); assert.equal(result.platform, null);
    assert.equal(result.touchPoints, 0); assert.equal(result.automation, false);
    assert.equal(result.canvas2d, true); assert.equal(result.canvasHash, null); assert.equal(result.canvasStable, null);
    assert.equal(result.webgl, false); assert.equal(result.webglRenderer, null);
    assert.deepEqual(contexts, ["2d", "webgl2", "webgl"]);
  } finally {
    for (const name of names) { const original = originals.get(name); if (original) Object.defineProperty(globalThis, name, original); else Reflect.deleteProperty(globalThis, name); }
  }
});
