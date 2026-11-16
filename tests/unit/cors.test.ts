import { test } from "node:test";
import assert from "node:assert/strict";
import { coreCors } from "../../src/server/http/cors.ts";
import { createIpHandler } from "../../src/server/http/ip-handler.ts";
import { createRequestBudget } from "../../src/server/http/ip-handler.ts";
import { apiUrl } from "../../src/lib/api-url.ts";

test("only the exact frontend Origin gets credential-free CORS", () => {
  for (const origin of ["https://evil.example", "https://ipinfo.dog.evil.example", "null", "http://ipinfo.dog"]) {
    const c = coreCors(new Request("https://api.ipinfo.dog/api/ip", { headers: { Origin: origin } }));
    assert.equal(c.response?.status, 403); assert.equal(c.headers["Access-Control-Allow-Origin"], undefined);
  }
  const c = coreCors(new Request("https://api.ipinfo.dog/api/ip", { headers: { Origin: "https://ipinfo.dog" } }));
  assert.equal(c.response, null); assert.equal(c.headers["Access-Control-Allow-Origin"], "https://ipinfo.dog");
  assert.equal(c.headers["Access-Control-Allow-Credentials"], undefined); assert.match(c.headers.Vary, /Origin/);
  assert.equal(coreCors(new Request("https://api.ipinfo.dog/api/ip")).headers["Access-Control-Allow-Origin"], undefined);
});
test("preflight permits only simple GET and does not consume lookup budget", async () => {
  let queries = 0;
  const handle = createIpHandler({ budget: createRequestBudget({ limit: 1 }), lookup: async () => { queries++; throw Error("should not run"); } });
  const headers = { Origin: "https://ipinfo.dog", "Access-Control-Request-Method": "GET" };
  const r = await handle(new Request("https://api.ipinfo.dog/api/ip", { method: "OPTIONS", headers }));
  assert.equal(r.status, 204); assert.equal(queries, 0);
  const rejectedHeaders: Record<string, string>[] = [{ "Access-Control-Request-Method": "POST" }, { "Access-Control-Request-Headers": "Authorization" }];
  for (const extra of rejectedHeaders) assert.equal(coreCors(new Request("https://api.ipinfo.dog/api/ip", { method: "OPTIONS", headers: { ...headers, ...extra } })).response?.status, 403);
  assert.equal((await handle(new Request("https://api.ipinfo.dog/api/ip?ip=bad"))).status, 503);
  assert.equal(queries, 1);
});
test("browser business requests target the dedicated API domain", () => {
  assert.equal(apiUrl("/api/ip?ip=8.8.8.8"), "https://api.ipinfo.dog/api/ip?ip=8.8.8.8");
  assert.equal(apiUrl("/api/connection"), "https://api.ipinfo.dog/api/connection");
});
