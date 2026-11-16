import { apiUrl } from "../../lib/api-url.ts";
import { parseIp } from "../../lib/ip.ts";
import { extraSourceIds, sourceErrorCodes, type ExtraSourceId, type SourceOutcome, type SourceRecord } from "../../lib/contracts/ip-sources.ts";
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const label = (v: unknown) => typeof v === "string" && v.length <= 256;
const names = (v: unknown) => object(v) && Object.entries(v).every(([k, s]) => ["en", "zh-CN", "zh-TW"].includes(k) && label(s));
const date = (v: unknown) => typeof v === "string" && Number.isFinite(Date.parse(v));
export function validSourceRecord(v: unknown, source: ExtraSourceId, address: string): v is SourceRecord {
  return object(v) && v.address === address && v.source === source
    && (v.country === null || (object(v.country) && (v.country.code === null || (typeof v.country.code === "string" && /^[A-Z]{2}$/.test(v.country.code))) && names(v.country.names)))
    && (v.city === null || names(v.city)) && (v.asn === null || (typeof v.asn === "number" && Number.isInteger(v.asn) && v.asn > 0 && v.asn <= 4_294_967_295))
    && (v.organization === null || label(v.organization)) && (v.domain === null || label(v.domain)) && date(v.queriedAt)
    && Array.isArray(v.dataDates) && v.dataDates.length <= 3 && v.dataDates.every(d => object(d) && ["city", "country", "asn"].includes(String(d.kind)) && date(d.date));
}
export async function fetchSource(source: ExtraSourceId, address: string, signal: AbortSignal, transport: typeof fetch = fetch, timeoutMs = 8_000): Promise<SourceOutcome> {
  const fail = { ok: false, code: "UNAVAILABLE" } as const;
  try { if (!parseIp(address).isPublic) return fail; } catch { return fail; }
  const abort = new AbortController(), cancel = () => abort.abort();
  signal.addEventListener("abort", cancel, { once: true }); if (signal.aborted) cancel();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const operation = async (): Promise<SourceOutcome> => {
      const response = await transport(apiUrl(`/api/ip/sources?${new URLSearchParams({ ip: address, source })}`), {
        signal: abort.signal, credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store",
      });
      if (response.status === 429) return { ok: false, code: "RATE_LIMITED" };
      if (!response.ok) return fail;
      const body: unknown = await response.json();
      if (!object(body)) return fail;
      if (body.ok === true && validSourceRecord(body.data, source, address)) return { ok: true, data: body.data };
      if (body.ok === false && sourceErrorCodes.includes(body.code as never)) return { ok: false, code: body.code as Exclude<SourceOutcome, { ok: true }>["code"] };
      return fail;
    };
    return await Promise.race([operation(), new Promise<SourceOutcome>(resolve => {
      timer = setTimeout(() => { abort.abort(); resolve({ ok: false, code: "TIMEOUT" }); }, timeoutMs);
    })]);
  } catch { return fail; }
  finally { clearTimeout(timer); signal.removeEventListener("abort", cancel); }
}
export type SourceRowState = { phase: "loading" } | { phase: "done"; outcome: SourceOutcome };
export function createSourcesController(address: string, lookup = fetchSource) {
  const initial = Object.fromEntries(extraSourceIds.map(id => [id, { phase: "loading" }])) as Record<ExtraSourceId, SourceRowState>;
  let state = initial;
  const listeners = new Set<() => void>(), generations = { dbip: 0, ipinfo: 0 }, aborts = new Map<ExtraSourceId, AbortController>();
  const publish = (id: ExtraSourceId, row: SourceRowState) => { state = { ...state, [id]: row }; listeners.forEach(fn => fn()); };
  function retry(id: ExtraSourceId) {
    const generation = ++generations[id]; aborts.get(id)?.abort(); const abort = new AbortController(); aborts.set(id, abort);
    publish(id, { phase: "loading" });
    void lookup(id, address, abort.signal).catch((): SourceOutcome => ({ ok: false, code: "UNAVAILABLE" })).then(outcome => {
      if (generations[id] === generation && !abort.signal.aborted) publish(id, { phase: "done", outcome });
    });
  }
  return { subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
    getSnapshot: () => state, getServerSnapshot: () => initial, retry,
    refresh: () => extraSourceIds.forEach(retry),
    dispose: () => { extraSourceIds.forEach(id => { ++generations[id]; aborts.get(id)?.abort(); }); },
  };
}
