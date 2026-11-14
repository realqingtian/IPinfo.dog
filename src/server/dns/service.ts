import { dnsTypes, isDnsType, isResolver, normalizeDnsName, type DnsSelection, type DnsResult, type ResolverId, type DnsRecord } from "../../features/dns/contracts.ts";

const endpoints: Record<ResolverId, string> = {
  alidns: "https://dns.alidns.com/resolve", cloudflare: "https://cloudflare-dns.com/dns-query", google: "https://dns.google/resolve",
};
export function parseDnsParameters(params: URLSearchParams, resolverRequired = true): DnsSelection & { resolver?: ResolverId } {
  const keys = resolverRequired ? ["name", "type", "resolver"] : ["name", "type"];
  if ([...params.keys()].some(key => !keys.includes(key)) || keys.some(key => params.getAll(key).length !== 1)) throw new Error("INVALID_DNS");
  const name = normalizeDnsName(params.get("name") ?? ""), type = params.get("type") ?? "", resolver = params.get("resolver") ?? "";
  if (!isDnsType(type) || (resolverRequired && !isResolver(resolver))) throw new Error("INVALID_DNS");
  return { name, type, ...(isResolver(resolver) ? { resolver } : {}) };
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_RESPONSE");
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number): string {
  if (typeof value !== "string" || value.length > max) throw new Error("INVALID_RESPONSE");
  return value.replace(/[\x00-\x1f\x7f]/g, x => `\\u${x.charCodeAt(0).toString(16).padStart(4, "0")}`);
}
export function normalizeDnsResponse(raw: unknown, selection: DnsSelection) {
  const body = object(raw), status = body.Status;
  if (!Number.isInteger(status) || (status as number) < 0 || (status as number) > 15 || body.TC === true) throw new Error("INVALID_RESPONSE");
  const question = Array.isArray(body.Question) ? body.Question : [body.Question];
  if (question.length !== 1) throw new Error("INVALID_RESPONSE");
  const q = object(question[0]);
  if (text(q.name, 254).replace(/\.$/, "").toLowerCase() !== selection.name || q.type !== dnsTypes[selection.type]) throw new Error("INVALID_RESPONSE");
  const answers = body.Answer ?? [];
  if (!Array.isArray(answers) || answers.length > 64) throw new Error("INVALID_RESPONSE");
  const records: DnsRecord[] = answers.map(value => {
    const r = object(value);
    if (!Number.isInteger(r.type) || (r.type as number) < 1 || (r.type as number) > 65535 || !Number.isInteger(r.TTL) || (r.TTL as number) < 0 || (r.TTL as number) > 4294967295) throw new Error("INVALID_RESPONSE");
    return { name: text(r.name, 254), type: r.type as number, ttl: r.TTL as number, data: text(r.data, 8192) };
  });
  const states = { 2: "servfail", 3: "nxdomain", 5: "refused" } as const;
  return { records, rcode: status as number,
    status: status === 0 ? records.length ? "ok" : "empty" : states[status as keyof typeof states] ?? "dns-error",
    ...(typeof body.AD === "boolean" ? { authenticated: body.AD } : {}),
  } satisfies Pick<DnsResult, "records" | "rcode" | "status" | "authenticated">;
}
export function createDnsService({ fetcher = fetch, timeoutMs = 5000, maxBytes = 131072, maxConcurrent = 8, now = performance.now.bind(performance) } = {}) {
  let active = 0;
  return async function lookup(selection: DnsSelection, resolver: ResolverId, signal?: AbortSignal): Promise<DnsResult> {
    // Validate again at the service boundary; never use a caller-provided endpoint.
    const name = normalizeDnsName(selection.name);
    if (!isDnsType(selection.type) || !isResolver(resolver)) throw new Error("INVALID_DNS");
    const start = now(), base = { name, type: selection.type, resolver, records: [], elapsedMs: 0 };
    if (active >= maxConcurrent) return { ...base, status: "limited" };
    active++;
    const timeout = AbortSignal.timeout(timeoutMs), combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    try {
      const url = new URL(endpoints[resolver]); url.search = new URLSearchParams({ name, type: String(dnsTypes[selection.type]) }).toString();
      // Suppress ECS on Google's explicitly documented endpoint. No visitor headers are forwarded.
      if (resolver === "google") url.searchParams.set("edns_client_subnet", "0.0.0.0/0");
      const response = await fetcher(url, { signal: combined, headers: { Accept: "application/dns-json" }, redirect: "error", cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" });
      if (!response.ok) { await response.body?.cancel(); return { ...base, status: response.status === 429 ? "limited" : "unavailable", elapsedMs: Math.round(now() - start) }; }
      if (!/^application\/(?:dns-json|json)(?:;|$)/i.test(response.headers.get("content-type") ?? "")) { await response.body?.cancel(); throw new Error("INVALID_RESPONSE"); }
      if (!response.body) throw new Error("INVALID_RESPONSE");
      const reader = response.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
      try { for (;;) { const item = await reader.read(); if (item.done) break; size += item.value.byteLength; if (size > maxBytes) throw new Error("INVALID_RESPONSE"); chunks.push(item.value); } }
      finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
      const bytes = Buffer.concat(chunks);
      return { ...base, ...normalizeDnsResponse(JSON.parse(bytes.toString("utf8")), { ...selection, name }), elapsedMs: Math.round(now() - start) };
    } catch (error) {
      return { ...base, status: signal?.aborted ? "cancelled" : timeout.aborted ? "timeout" : error instanceof SyntaxError || (error instanceof Error && error.message === "INVALID_RESPONSE") ? "invalid-response" : "unavailable", elapsedMs: Math.round(now() - start) };
    } finally { active--; }
  };
}
