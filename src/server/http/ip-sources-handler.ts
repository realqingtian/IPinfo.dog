import { extraSourceIds, type ExtraSourceId, type SourceOutcome } from "../../lib/contracts/ip-sources.ts";
import { parseIp } from "../../lib/ip.ts";
import { coreCors } from "./cors.ts";
import { createRequestBudget } from "./ip-handler.ts";
export function createIpSourcesHandler({ lookup, budget = createRequestBudget() }: {
  lookup: (source: ExtraSourceId, address: string) => Promise<SourceOutcome>;
  budget?: ReturnType<typeof createRequestBudget>;
}) {
  return async (request: Request): Promise<Response> => {
    const cors = coreCors(request); if (cors.response) return cors.response;
    const headers = cors.headers;
    if (request.method !== "GET") return new Response(null, { status: 405, headers });
    const retry = budget.take();
    if (retry) return Response.json({ ok: false, code: "RATE_LIMITED" }, { status: 429, headers: { ...headers, "Retry-After": String(retry) } });
    const fail = (code: string, status = 400) => Response.json({ ok: false, code }, { status, headers });
    if (request.url.length > 2048) return fail("INVALID_IP");
    const params = new URL(request.url).searchParams;
    if (params.getAll("ip").length !== 1 || params.getAll("source").length !== 1 || [...params.keys()].some(k => !["ip", "source"].includes(k))) return fail("INVALID_IP");
    const source = params.get("source");
    if (!extraSourceIds.includes(source as ExtraSourceId)) return fail("INVALID_SOURCE");
    let parsed;
    try { parsed = parseIp(params.get("ip")!); } catch { return fail("INVALID_IP"); }
    if (!parsed.isPublic) return fail("NON_PUBLIC_IP", 422);
    try { return Response.json(await lookup(source as ExtraSourceId, parsed.address), { headers }); }
    catch { return Response.json({ ok: false, code: "UNAVAILABLE" }, { headers }); }
  };
}
