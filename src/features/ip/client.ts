import type { GeoCountry, IpInformation } from "../../lib/contracts/ip.ts";
import type { LookupOutcome } from "./query.ts";
const codes = { INVALID_IP: 400, NON_PUBLIC_IP: 422, NO_RECORD: 404, DATA_UNAVAILABLE: 503, TIMEOUT: 504, RATE_LIMITED: 429 } as const;
const editions = ["GeoLite2-City", "GeoLite2-Country", "GeoLite2-ASN"];
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const names = (value: unknown) => object(value) && Object.values(value).every((name) => typeof name === "string");
const country = (value: unknown): value is GeoCountry | null => value === null || (object(value) && (value.code === null || typeof value.code === "string") && names(value.names));
const date = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value));
function validResult(value: unknown, target: string): value is IpInformation {
  if (!object(value)) return false;
  return value.address === target && value.family === (target.includes(":") ? "ipv6" : "ipv4") && country(value.geolocatedCountry) && country(value.registeredCountry)
    && (value.city === null || names(value.city)) && Array.isArray(value.subdivisions) && value.subdivisions.every(names)
    && (value.accuracyRadiusKm === null || typeof value.accuracyRadiusKm === "number") && (value.asn === null || typeof value.asn === "number") && (value.organization === null || typeof value.organization === "string")
    && typeof value.datasetId === "string" && date(value.queriedAt) && object(value.fieldSources) && Object.values(value.fieldSources).every((source) => source === null || editions.includes(String(source)))
    && Array.isArray(value.sources) && value.sources.length === 3 && value.sources.every((source) => object(source) && editions.includes(String(source.edition)) && date(source.buildTime) && typeof source.found === "boolean")
    && Array.isArray(value.conflicts) && value.conflicts.every((conflict) => object(conflict) && ["geolocatedCountry", "registeredCountry"].includes(String(conflict.field)) && conflict.city !== null && conflict.country !== null && country(conflict.city) && country(conflict.country));
}
export async function fetchIp(target: string, signal: AbortSignal, transport: typeof fetch = fetch, timeoutMs = 12_000): Promise<LookupOutcome> {
  const abort = new AbortController(), cancel = () => abort.abort();
  signal.addEventListener("abort", cancel, { once: true }); if (signal.aborted) abort.abort();
  let timer: ReturnType<typeof setTimeout> | undefined, timedOut = false;
  try {
    const operation = (async (): Promise<LookupOutcome> => {
      const response = await transport(`/api/ip?${new URLSearchParams({ ip: target })}`, { signal: abort.signal, cache: "no-store" });
      const body: unknown = await response.json();
      if (response.ok && object(body) && body.ok === true && validResult(body.data, target)) return { ok: true, data: body.data };
      if (!response.ok && object(body) && body.ok === false && object(body.error)) {
        const code = body.error.code;
        if (typeof code === "string" && code in codes && codes[code as keyof typeof codes] === response.status) {
          const retry = Number(response.headers.get("Retry-After"));
          return { ok: false, code: code as keyof typeof codes, retryable: ["DATA_UNAVAILABLE", "TIMEOUT", "RATE_LIMITED"].includes(code), ...(code === "RATE_LIMITED" && Number.isFinite(retry) && retry > 0 ? { retryAfter: Math.min(3600, Math.ceil(retry)) } : {}) };
        }
      }
      return { ok: false, code: "DATA_UNAVAILABLE", retryable: true };
    })();
    return await Promise.race([operation, new Promise<LookupOutcome>((resolve) => { timer = setTimeout(() => { timedOut = true; abort.abort(); resolve({ ok: false, code: "TIMEOUT", retryable: true }); }, timeoutMs); })]);
  } catch { return { ok: false, code: timedOut ? "TIMEOUT" : "DATA_UNAVAILABLE", retryable: true }; }
  finally { clearTimeout(timer); signal.removeEventListener("abort", cancel); }
}
