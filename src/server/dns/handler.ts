import { createRequestBudget } from "../http/ip-handler.ts";
import { createDnsService, parseDnsParameters } from "./service.ts";

const responseHeaders = { "Cache-Control": "private, no-store", "CDN-Cache-Control": "no-store", "Cross-Origin-Resource-Policy": "same-origin", "X-Content-Type-Options": "nosniff" };
export function createDnsHandler({ lookup = createDnsService(), budget = createRequestBudget({ limit: 90 }) } = {}) {
  return async (request: Request) => {
    const retry = budget.take();
    if (retry) return Response.json({ ok: false, error: "RATE_LIMITED" }, { status: 429, headers: { ...responseHeaders, "Retry-After": String(retry) } });
    let selection;
    try { if (request.url.length > 2048) throw new Error(); selection = parseDnsParameters(new URL(request.url).searchParams); }
    catch { return Response.json({ ok: false, error: "INVALID_DNS" }, { status: 400, headers: responseHeaders }); }
    try { const data = await lookup(selection, selection.resolver!, request.signal); return Response.json({ ok: true, data }, { headers: responseHeaders }); }
    catch { return Response.json({ ok: false, error: "UNAVAILABLE" }, { status: 503, headers: responseHeaders }); }
  };
}
