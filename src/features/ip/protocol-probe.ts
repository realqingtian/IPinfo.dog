import { apiUrl } from "../../lib/api-url.ts";
import { parseIp } from "../../lib/ip.ts";
import { fetchExit, type Family, type ProbeOutcome } from "./exit.ts";

export const echoProviders = [
  { id: "ipify", name: "ipify", link: "https://www.ipify.org/", ipv4: "https://api.ipify.org?format=json", ipv6: "https://api6.ipify.org?format=json", format: "json" },
  { id: "ident", name: "ident.me", link: "https://api.ident.me/", ipv4: "https://4.ident.me/", ipv6: "https://6.ident.me/", format: "text" },
  { id: "ddnspod", name: "DDNSPod", link: "https://ipv6.ddnspod.com/", ipv4: "https://ipv4.ddnspod.com/", ipv6: "https://ipv6.ddnspod.com/", format: "text" },
  { id: "myipla", name: "MyIP.la", link: "https://www.myip.la/", ipv4: "https://v4.myip.la/", ipv6: "https://v6.myip.la/", format: "text" },
  { id: "mir6", name: "MIR6", link: "https://ip.mir6.com/", ipv4: "https://ipv4.ip.mir6.com/", ipv6: "https://ipv6.ip.mir6.com/", format: "text" },
  { id: "icanhazip", name: "icanhazip", link: "https://icanhazip.com/", ipv4: "https://ipv4.icanhazip.com/", ipv6: "https://ipv6.icanhazip.com/", format: "text" },
  { id: "ipleak", name: "IPLeak", link: "https://ipleak.net/", ipv4: "https://ipv4.ipleak.net/json/", ipv6: "https://ipv6.ipleak.net/json/", format: "json" },
  { id: "wtfismyip", name: "WTFismyIP", link: "https://wtfismyip.com/", ipv4: "https://ipv4.wtfismyip.com/text", ipv6: "https://ipv6.wtfismyip.com/text", format: "text" },
] as const;
type EchoProvider = typeof echoProviders[number];
type EchoSource = "site" | EchoProvider["id"];
export type EchoRow = { phase: "loading" } | { phase: "done"; outcome: ProbeOutcome; otherFamily?: Family };
export type EchoSnapshot = Record<EchoSource, EchoRow>;
export type ComparisonRows = EchoSnapshot & { ipip: EchoRow };
export const ipipProvider = { id: "ipip", name: "IPIP.net", link: "https://www.ipip.net/myip.html" } as const;

const failure = { ok: false, code: "DETECTION_FAILED" } as const;

/** Fixed browser-only echo: bounded body, strict protocol, no credentials or redirects. */
async function echoAttempt(family: Family | "any", url: string, format: "text" | "json" | "ipip", signal: AbortSignal, transport: typeof fetch, timeoutMs: number): Promise<ProbeOutcome> {
  if (signal.aborted || (typeof window === "undefined" && transport === fetch)) return failure;
  const abort = new AbortController();
  let stop!: (outcome: ProbeOutcome) => void;
  const stopped = new Promise<ProbeOutcome>(resolve => { stop = resolve; });
  const cancel = () => { stop(failure); abort.abort(); };
  signal.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(() => { stop({ ok: false, code: "TIMEOUT" }); abort.abort(); }, timeoutMs);
  const operation = async (): Promise<ProbeOutcome> => {
    const response = await transport(url, { signal: abort.signal, redirect: "error", mode: "cors", credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store" });
    if (response.status === 429) return { ok: false, code: "RATE_LIMITED" };
    if (!response.ok || !response.body || Number(response.headers.get("Content-Length")) > 4096) return failure;
    const reader = response.body.getReader(), chunks: Uint8Array[] = []; let length = 0;
    try {
      for (;;) { const item = await reader.read(); if (item.done) break; length += item.value.byteLength; if (length > 4096) return failure; chunks.push(item.value); }
    } finally { await reader.cancel().catch(() => {}); }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const text = new TextDecoder().decode(bytes).trim();
    let value: unknown = text;
    if (format !== "text") {
      let body: unknown = JSON.parse(text);
      if (format === "ipip") {
        if (!body || typeof body !== "object" || !("ret" in body) || body.ret !== "ok" || !("data" in body)) return failure;
        body = body.data;
      }
      value = body && typeof body === "object" && "ip" in body ? body.ip : undefined;
    }
    if (typeof value !== "string") return failure;
    const parsed = parseIp(value);
    return parsed.isPublic && (family === "any" || parsed.family === family) ? { ok: true, data: { address: parsed.address, family: parsed.family, detectedAt: new Date().toISOString() } } : failure;
  };
  try { return await Promise.race([operation(), stopped]); }
  catch { return failure; }
  finally { clearTimeout(timer); signal.removeEventListener("abort", cancel); abort.abort(); }
}

/** IPIP.net observes whichever protocol the browser selected on this one connection. */
export function fetchIpipExit(signal: AbortSignal, transport: typeof fetch = fetch) {
  return echoAttempt("any", "https://myip.ipip.net/json", "ipip", signal, transport, 5_000);
}

export function ipipRow(family: Family, outcome?: ProbeOutcome): EchoRow {
  if (!outcome) return { phase: "loading" };
  if (outcome.ok && outcome.data.family !== family) return { phase: "done", outcome: failure, otherFamily: outcome.data.family };
  return { phase: "done", outcome };
}

function echoRequests(providers: readonly EchoProvider[], family: Family, signal: AbortSignal, transport: typeof fetch, timeoutMs: number, observe?: (source: EchoSource, outcome: ProbeOutcome, otherFamily?: Family) => void) {
  return providers.map(async provider => {
    const outcome = await echoAttempt(family, provider[family], provider.format, signal, transport, timeoutMs);
    observe?.(provider.id, outcome);
    return outcome;
  });
}
/** Accept the first valid result; late results remain comparisons, never replace it. */
function firstUsable(requests: Promise<ProbeOutcome>[], signal: AbortSignal): Promise<ProbeOutcome> {
  return new Promise(resolve => {
    let remaining = requests.length;
    const failures: ProbeOutcome[] = [];
    for (const request of requests) void request.then(result => {
      if (signal.aborted) { resolve(failure); return; }
      if (result.ok) { resolve(result); return; }
      failures.push(result);
      if (--remaining === 0) resolve(failures.some(x => !x.ok && x.code === "TIMEOUT") ? { ok: false, code: "TIMEOUT" } : failures.every(x => !x.ok && x.code === "RATE_LIMITED") ? { ok: false, code: "RATE_LIMITED" } : failure);
    });
  });
}
export async function fetchProtocolEcho(family: Family, signal: AbortSignal, transport: typeof fetch = fetch, timeoutMs = 5_000): Promise<ProbeOutcome> {
  if (signal.aborted) return failure;
  return firstUsable(echoRequests(echoProviders, family, signal, transport, timeoutMs), signal);
}
function detect(family: Family, signal: AbortSignal, transport: typeof fetch, observe?: (source: EchoSource, outcome: ProbeOutcome, otherFamily?: Family) => void): Promise<ProbeOutcome> {
  if (signal.aborted) return Promise.resolve(failure);
  const site = fetchExit(apiUrl("/api/connection"), "any", signal, transport).then(result => {
    const otherFamily = result.ok && result.data.family !== family ? result.data.family : undefined;
    const candidate = otherFamily ? failure : result;
    observe?.("site", candidate, otherFamily);
    return candidate;
  });
  // A faster regional route may observe a different exit from the existing probes.
  const primaryEcho = (provider: EchoProvider) => provider.id === "ipify" || provider.id === "ident";
  const run = (providers: readonly EchoProvider[]) => echoRequests(providers, family, signal, transport, 5_000, observe);
  const primary = firstUsable([site, ...run(echoProviders.filter(primaryEcho))], signal);
  const backup = firstUsable(run(echoProviders.filter(provider => !primaryEcho(provider))), signal);
  return primary.then(result => result.ok ? result : firstUsable([Promise.resolve(result), backup], signal));
}
export function fetchProtocolExit(family: Family, signal: AbortSignal, transport: typeof fetch = fetch) { return detect(family, signal, transport); }

export function createProtocolDetector(family: Family, transport: typeof fetch = fetch) {
  const initial = Object.fromEntries(["site", ...echoProviders.map(p => p.id)].map(id => [id, { phase: "loading" }])) as EchoSnapshot;
  let state = initial, generation = 0;
  const listeners = new Set<() => void>();
  const publish = (next: EchoSnapshot) => { state = next; listeners.forEach(listener => listener()); };
  return {
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => state, getServerSnapshot: () => initial,
    probe(signal: AbortSignal) {
      const current = ++generation; publish(initial);
      return detect(family, signal, transport, (source, outcome, otherFamily) => {
        if (current === generation) publish({ ...state, [source]: { phase: "done", outcome, ...(otherFamily ? { otherFamily } : {}) } });
      });
    },
  };
}
