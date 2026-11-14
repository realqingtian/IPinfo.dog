import { isResolver, isDnsType, type DnsSelection, type DnsResult, type ResolverId } from "./contracts.ts";

export async function fetchDns(selection: DnsSelection, resolver: ResolverId, signal: AbortSignal): Promise<DnsResult> {
  const fallback: DnsResult = { ...selection, resolver, status: "unavailable", records: [], elapsedMs: 0 };
  try {
    const response = await fetch(`/api/dns?${new URLSearchParams({ ...selection, resolver })}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(7000)]), cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" });
    if (response.status === 429) return { ...fallback, status: "limited" };
    const body = await response.json();
    const d = body.data;
    if (!response.ok || body.ok !== true || !d || !isResolver(d.resolver) || d.resolver !== resolver || !isDnsType(d.type) || d.type !== selection.type || d.name !== selection.name || !Array.isArray(d.records) || d.records.length > 64 || typeof d.status !== "string" || !["ok", "empty", "nxdomain", "servfail", "refused", "dns-error", "timeout", "unavailable", "invalid-response", "limited", "cancelled"].includes(d.status) || !Number.isFinite(d.elapsedMs)) return fallback;
    for (const record of d.records) if (!record || typeof record.name !== "string" || typeof record.data !== "string" || !Number.isInteger(record.type) || !Number.isInteger(record.ttl)) return fallback;
    return d as DnsResult;
  } catch (error) { return { ...fallback, status: signal.aborted ? "cancelled" : error instanceof Error && error.name === "TimeoutError" ? "timeout" : "unavailable" }; }
}
