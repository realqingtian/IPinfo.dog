import { parseIp } from "../../lib/ip.ts";
import type { ExtraSourceId, SourceErrorCode, SourceOutcome, SourceRecord } from "../../lib/contracts/ip-sources.ts";

export class SourceError extends Error {
  code: SourceErrorCode;
  constructor(code: SourceErrorCode) { super(code); this.code = code; }
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown) => typeof v === "string" && v.trim() && v.trim() !== "-" && v.length <= 256 && !/[\u0000-\u001f\u007f]/u.test(v) ? v.trim() : null;
const asnNumber = (v: unknown) => {
  const n = typeof v === "number" ? v : typeof v === "string" && /^AS[1-9]\d{0,9}$/.test(v) ? Number(v.slice(2)) : null;
  return n && Number.isInteger(n) && n > 0 && n <= 4_294_967_295 ? n : null;
};
export function normalizePublicSource(source: ExtraSourceId, body: unknown, address: string, queriedAt: string): SourceRecord {
  if (!object(body)) throw new SourceError("UNAVAILABLE");
  const returnedIp = source === "freeipapi" ? body.ipAddress : body.ip;
  if (typeof returnedIp !== "string" || parseIp(returnedIp).address !== address) throw new SourceError("UNAVAILABLE");
  const location = source === "ipquery" ? body.location : body, isp = source === "ipquery" ? body.isp : body;
  if (!object(location) || !object(isp)) throw new SourceError("NO_RECORD");
  const rawCode = source === "freeipapi" ? location.countryCode : location.country_code;
  const code = typeof rawCode === "string" && /^[A-Z]{2}$/.test(rawCode) ? rawCode : null;
  const name = text(source === "freeipapi" ? location.countryName : location.country), city = text(source === "freeipapi" ? location.cityName : location.city);
  const rawAsn = source === "freeipapi" && typeof isp.asn === "string" && /^[1-9]\d{0,9}$/.test(isp.asn) ? Number(isp.asn) : isp.asn;
  const asn = asnNumber(rawAsn), organization = text(source === "ipquery" ? isp.org : isp.asnOrganization);
  if (!code && !name && !city && !asn && !organization) throw new SourceError("NO_RECORD");
  return { address, source, country: code || name ? { code, names: name ? { en: name } : {} } : null,
    city: city ? { en: city } : null, asn, organization, domain: null, queriedAt, dataDates: [] };
}
export function publicSourceUrl(source: ExtraSourceId, address: string) {
  const ip = parseIp(address); if (!ip.isPublic) throw new SourceError("UNAVAILABLE");
  const target = encodeURIComponent(ip.address);
  switch (source) {
    case "freeipapi": return `https://free.freeipapi.com/api/v1/json/${target}`;
    case "ipquery": return `https://api.ipquery.io/${target}?format=json`;
    default: throw new SourceError("UNAVAILABLE");
  }
}

/** Browser-only vendor transport: fixed CORS URLs, no key, JSONP or server fallback. */
export function createBrowserSourceClient({ transport, now = Date.now, timeoutMs = 5_000 }: {
  transport?: typeof fetch; now?: () => number; timeoutMs?: number;
} = {}) {
  const cache = new Map<string, { expires: number; outcome: SourceOutcome }>();
  return async (source: ExtraSourceId, address: string, signal: AbortSignal, force = false): Promise<SourceOutcome> => {
    const failure = { ok: false, code: "UNAVAILABLE" } as const;
    // Injected transports exist only for isolated tests; production must run in a browser.
    if ((!transport && typeof window === "undefined") || signal.aborted) return failure;
    let target: string, url: string;
    try { target = parseIp(address).address; url = publicSourceUrl(source, target); } catch { return failure; }
    const key = `${source}:${target}`, cached = cache.get(key);
    if (!force && cached && cached.expires > now()) return structuredClone(cached.outcome);
    cache.delete(key);
    const abort = new AbortController();
    let settle!: (value: SourceOutcome) => void;
    const stopped = new Promise<SourceOutcome>(resolve => { settle = resolve; });
    const cancel = () => { settle(failure); abort.abort(); };
    signal.addEventListener("abort", cancel, { once: true }); if (signal.aborted) cancel();
    const timer = setTimeout(() => { settle({ ok: false, code: "TIMEOUT" }); abort.abort(); }, timeoutMs);
    const operation = async (): Promise<SourceOutcome> => {
      const response = await (transport ?? fetch)(url, { mode: "cors", credentials: "omit", redirect: "error", referrerPolicy: "no-referrer", cache: "no-store", headers: { Accept: "application/json" }, signal: abort.signal });
      if (response.status === 429) return { ok: false, code: "RATE_LIMITED" };
      if (response.status === 404) return { ok: false, code: "NO_RECORD" };
      if (!response.ok || !response.body || Number(response.headers.get("Content-Length")) > 65_536) return failure;
      const reader = response.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
      try {
        for (;;) { const item = await reader.read(); if (item.done) break; size += item.value.byteLength;
          if (size > 65_536) return failure; chunks.push(item.value); }
      } finally { await reader.cancel().catch(() => {}); }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      return { ok: true, data: normalizePublicSource(source, JSON.parse(new TextDecoder().decode(bytes)), target, new Date(now()).toISOString()) };
    };
    let outcome: SourceOutcome;
    try { outcome = await Promise.race([operation(), stopped]); }
    catch (error) { outcome = error instanceof SourceError ? { ok: false, code: error.code } : failure; }
    finally { clearTimeout(timer); signal.removeEventListener("abort", cancel); abort.abort(); }
    if (!signal.aborted) {
      cache.set(key, { expires: now() + (outcome.ok ? 300_000 : 15_000), outcome: structuredClone(outcome) });
      while (cache.size > 128) cache.delete(cache.keys().next().value!);
    }
    return outcome;
  };
}
export const fetchSource = createBrowserSourceClient();
