import { normalizeProviderDomain } from "../../lib/provider-domain.ts";
import { type ProviderIcon } from "../provider-icon.ts";
import { coreCors } from "./cors.ts";
import { createRequestBudget } from "./ip-handler.ts";

export function createProviderIconHandler({ lookup, budget = createRequestBudget() }: { lookup: (domain: string) => Promise<ProviderIcon | null>; budget?: ReturnType<typeof createRequestBudget> }) {
  return async (request: Request) => {
    const cors = coreCors(request); if (cors.response) return cors.response;
    const headers = { ...cors.headers, "Referrer-Policy": "no-referrer" };
    if (request.method !== "GET") return new Response(null, { status: 405, headers });
    const retry = budget.take();
    if (retry) return new Response(null, { status: 429, headers: { ...headers, "Retry-After": String(retry) } });
    const params = new URL(request.url).searchParams, domain = normalizeProviderDomain(params.get("domain"));
    if (request.url.length > 512 || !domain || params.getAll("domain").length !== 1 || [...params.keys()].some(k => k !== "domain")) return new Response(null, { status: 400, headers });
    try {
      const icon = await lookup(domain);
      return icon ? new Response(new Uint8Array(icon.bytes), { headers: { ...headers, "Content-Type": icon.type } }) : new Response(null, { status: 204, headers });
    } catch { return new Response(null, { status: 204, headers }); }
  };
}
