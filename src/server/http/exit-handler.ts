import { timingSafeEqual } from "node:crypto";
import { parseIp } from "../../lib/ip.ts";
import { createRequestBudget } from "./ip-handler.ts";

export const exitPolicy = { windowMs: 60_000, perAddress: 30, maxAddresses: 2048 } as const;
export function createExitHandler({ token, now = Date.now, limit = exitPolicy.perAddress, maxAddresses = exitPolicy.maxAddresses }: {
  token: () => Promise<string | null>; now?: () => number; limit?: number; maxAddresses?: number;
}) {
  const buckets = new Map<string, { count: number; expires: number }>();
  const globalBudget = createRequestBudget({ now, limit: 600 });
  return async (request: Request) => {
    const origin = request.headers.get("Origin");
    const headers: Record<string, string> = { "Cache-Control": "private, no-store, no-transform", "CDN-Cache-Control": "no-store",
      "Vary": "Origin", "Cross-Origin-Resource-Policy": "same-site", "X-Content-Type-Options": "nosniff" };
    const error = (code: string, status: number, retryAfter?: number) => Response.json({ ok: false, error: { code } }, { status, headers: { ...headers, ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}) } });
    const expected = await token();
    if (!expected || expected.length < 32) return error("PROBE_UNAVAILABLE", 503);
    const supplied = request.headers.get("X-IPinfo-Token") ?? "";
    const suppliedBytes = Buffer.from(supplied), expectedBytes = Buffer.from(expected);
    if (suppliedBytes.length !== expectedBytes.length || !timingSafeEqual(suppliedBytes, expectedBytes)) return error("ACCESS_DENIED", 403);
    if (origin && origin !== "https://ipinfo.dog") return error("ACCESS_DENIED", 403);
    if (origin) headers["Access-Control-Allow-Origin"] = origin;
    if (request.method === "OPTIONS") {
      if (request.headers.get("Access-Control-Request-Method") !== "GET" || request.headers.get("Access-Control-Request-Headers")) return error("ACCESS_DENIED", 403);
      return new Response(null, { status: 204, headers: { ...headers, "Access-Control-Allow-Methods": "GET", "Access-Control-Max-Age": "0" } });
    }
    if (!["GET", "HEAD"].includes(request.method)) return error("METHOD_NOT_ALLOWED", 405);
    if (new URL(request.url).search) return error("INVALID_REQUEST", 400);
    let parsed;
    try { parsed = parseIp(request.headers.get("X-IPinfo-Address") ?? ""); } catch { return error("ACCESS_DENIED", 403); }
    if (!parsed.isPublic || parsed.family !== request.headers.get("X-IPinfo-Family")) return error("ACCESS_DENIED", 403);
    const time = now(), key = parsed.address;
    let bucket = buckets.get(key);
    if (!bucket || bucket.expires <= time) bucket = { count: 0, expires: time + exitPolicy.windowMs };
    buckets.delete(key); buckets.set(key, bucket);
    while (buckets.size > maxAddresses) buckets.delete(buckets.keys().next().value!);
    if (++bucket.count > limit) return error("RATE_LIMITED", 429, Math.max(1, Math.ceil((bucket.expires - time) / 1000)));
    const retry = globalBudget.take(); if (retry) return error("RATE_LIMITED", 429, retry);
    const body = { ok: true, data: { address: parsed.address, family: parsed.family, detectedAt: new Date(time).toISOString() } };
    return request.method === "HEAD" ? new Response(null, { headers }) : Response.json(body, { headers });
  };
}
