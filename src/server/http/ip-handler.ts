import type { IpErrorCode, IpInformation, IpResponse } from "../../lib/contracts/ip.ts";
import { GeoIpError } from "../geoip/errors.ts";
import { coreCors } from "./cors.ts";

const statuses: Record<IpErrorCode, number> = {
  INVALID_IP: 400, NON_PUBLIC_IP: 422, NO_RECORD: 404,
  DATA_UNAVAILABLE: 503, TIMEOUT: 504, RATE_LIMITED: 429,
};
export const requestPolicy = Object.freeze({ windowMs: 60_000, limit: 120 });

/** Process-wide resource budget; never trusts client-supplied forwarding headers. */
export function createRequestBudget({ now = Date.now, windowMs = requestPolicy.windowMs, limit = requestPolicy.limit }: {
  now?: () => number; windowMs?: number; limit?: number;
} = {}) {
  let expires = 0;
  let remaining = 0;
  return { take() {
    const time = now();
    if (time >= expires) { expires = time + windowMs; remaining = limit; }
    if (remaining > 0) { remaining--; return 0; }
    return Math.max(1, Math.ceil((expires - time) / 1000));
  } };
}

const headers = {
  "Cache-Control": "private, no-store", "CDN-Cache-Control": "no-store",
  "Cross-Origin-Resource-Policy": "same-origin", "X-Content-Type-Options": "nosniff",
};
export function createIpHandler({ lookup, budget = createRequestBudget() }: {
  lookup: (input: string) => Promise<IpInformation>;
  budget?: ReturnType<typeof createRequestBudget>;
}) {
  return async (request: Request): Promise<Response> => {
    const cors = coreCors(request);
    if (cors.response) return cors.response;
    const responseHeaders = { ...headers, ...cors.headers };
    const retryAfter = budget.take();
    try {
      if (retryAfter) throw new GeoIpError("RATE_LIMITED");
      if (request.url.length > 2048) throw new GeoIpError("INVALID_IP");
      const params = new URL(request.url).searchParams;
      const values = params.getAll("ip");
      if (values.length !== 1 || [...params.keys()].some((key) => key !== "ip")) throw new GeoIpError("INVALID_IP");
      const data = await lookup(values[0]);
      return Response.json({ ok: true, data } satisfies IpResponse, { headers: responseHeaders });
    } catch (error) {
      const safe = error instanceof GeoIpError ? error : new GeoIpError("DATA_UNAVAILABLE");
      const body: IpResponse = { ok: false, error: {
        code: safe.code, retryable: ["DATA_UNAVAILABLE", "TIMEOUT", "RATE_LIMITED"].includes(safe.code),
        ...(safe.code === "NON_PUBLIC_IP" && safe.scope ? { scope: safe.scope } : {}),
      } };
      return Response.json(body, { status: statuses[safe.code], headers: {
        ...responseHeaders, ...(safe.code === "RATE_LIMITED" ? { "Retry-After": String(retryAfter) } : {}),
      } });
    }
  };
}
