import { apiUrl } from "../../lib/api-url.ts";
import { parseIp } from "../../lib/ip.ts";
import { normalizeProviderDomain } from "../../lib/provider-domain.ts";
import type { SourceOutcome, SourceRecord } from "../../lib/contracts/ip-sources.ts";
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const optionalText = (v: unknown) => v === null || typeof v === "string" && v.length > 0 && v.length <= 256 && !/[\u0000-\u001f\u007f]/u.test(v);
export function validLocalRecord(value: unknown, address: string): value is SourceRecord {
  if (!object(value)) return false;
  const country = value.country;
  return value.source === "ipinfo" && value.address === address && value.city === null
    && (country === null || object(country) && typeof country.code === "string" && /^[A-Z]{2}$/.test(country.code) && object(country.names) && Object.values(country.names).every(n => typeof n === "string" && optionalText(n)))
    && (value.asn === null || typeof value.asn === "number" && Number.isInteger(value.asn) && value.asn > 0 && value.asn <= 4_294_967_295)
    && optionalText(value.organization) && (value.domain === null || typeof value.domain === "string" && normalizeProviderDomain(value.domain) === value.domain)
    && typeof value.queriedAt === "string" && Number.isFinite(Date.parse(value.queriedAt))
    && (value.updateWarning === undefined || typeof value.updateWarning === "boolean")
    && Array.isArray(value.dataDates) && value.dataDates.length === 2 && value.dataDates.every(d => object(d) && ["country", "asn"].includes(String(d.kind)) && typeof d.date === "string" && Number.isFinite(Date.parse(d.date)));
}
export async function fetchLocalIpinfo(address: string, signal: AbortSignal, transport: typeof fetch = fetch, timeoutMs = 5000): Promise<SourceOutcome> {
  const failure = { ok: false, code: "UNAVAILABLE" } as const, abort = new AbortController();
  let stop!: (outcome: SourceOutcome) => void;
  const cancelled = new Promise<SourceOutcome>(resolve => { stop = resolve; });
  const cancel = () => { stop(failure); abort.abort(); }; signal.addEventListener("abort", cancel, { once: true }); if (signal.aborted) abort.abort();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const target = parseIp(address); if (!target.isPublic || signal.aborted) return failure;
    const task = async (): Promise<SourceOutcome> => {
      const response = await transport(apiUrl(`/api/ip/sources?${new URLSearchParams({ ip: target.address, source: "ipinfo" })}`), { signal: abort.signal, credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store", redirect: "error" });
      if (!response.body || Number(response.headers.get("Content-Length")) > 16384) return failure;
      const reader = response.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
      try { for (;;) { const item = await reader.read(); if (item.done) break; size += item.value.byteLength; if (size > 16384) return failure; chunks.push(item.value); } }
      finally { await reader.cancel().catch(() => {}); }
      const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      const body: unknown = JSON.parse(new TextDecoder().decode(bytes));
      if (response.ok && object(body) && body.ok === true && validLocalRecord(body.data, target.address)) return { ok: true, data: body.data };
      return { ok: false, code: response.status === 429 ? "RATE_LIMITED" : response.status === 404 ? "NO_RECORD" : "UNAVAILABLE" };
    };
    return await Promise.race([task(), cancelled, new Promise<SourceOutcome>(resolve => { timer = setTimeout(() => { abort.abort(); resolve({ ok: false, code: "TIMEOUT" }); }, timeoutMs); })]);
  } catch { return failure; } finally { clearTimeout(timer); signal.removeEventListener("abort", cancel); abort.abort(); }
}
