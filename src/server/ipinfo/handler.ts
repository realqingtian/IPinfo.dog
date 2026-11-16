import { coreCors } from "../http/cors.ts";
import { createRequestBudget } from "../http/ip-handler.ts";
import { parseIp } from "../../lib/ip.ts";
import type { SourceRecord } from "../../lib/contracts/ip-sources.ts";
export function createIpinfoHandler({ lookup, budget = createRequestBudget() }: {
  lookup: (ip: string) => Promise<SourceRecord | null>; budget?: ReturnType<typeof createRequestBudget>;
}) {
  return async (request: Request) => {
    const cors = coreCors(request); if (cors.response) return cors.response;
    const fail = (code: string, status: number, extra = {}) => Response.json({ ok: false, error: { code } }, { status, headers: { ...cors.headers, ...extra } });
    const params = new URL(request.url).searchParams;
    if (params.getAll("source").length !== 1 || params.get("source") !== "ipinfo") return fail("UNAVAILABLE", 404);
    if (request.url.length > 2048 || params.getAll("ip").length !== 1 || [...params.keys()].some(k => !["ip", "source"].includes(k))) return fail("UNAVAILABLE", 400);
    const retry = budget.take(); if (retry) return fail("RATE_LIMITED", 429, { "Retry-After": String(retry) });
    let address: string; try { const ip = parseIp(params.get("ip")!); if (!ip.isPublic) return fail("UNAVAILABLE", 422); address = ip.address; } catch { return fail("UNAVAILABLE", 400); }
    try { const data = await lookup(address); return data ? Response.json({ ok: true, data }, { headers: cors.headers }) : fail("NO_RECORD", 404); }
    catch { return fail("UNAVAILABLE", 503); }
  };
}
