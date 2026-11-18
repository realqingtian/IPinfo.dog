import { parseIp } from "../../lib/ip.ts";
import { routingTargets, type RoutingTarget } from "./catalog.ts";

export type RoutingResult = { address: string; family: "ipv4" | "ipv6"; country: string | null; colo: string | null; elapsedMs: number };
export type RoutingError = "TIMEOUT" | "UNAVAILABLE" | "NO_ADDRESS" | "RATE_LIMITED" | "CANCELLED";
export type RoutingOutcome = { ok: true; data: RoutingResult } | { ok: false; code: RoutingError };
export type RoutingRow = { phase: "idle" | "queued" | "loading" } | { phase: "done"; outcome: RoutingOutcome };
export type RoutingSnapshot = Readonly<Record<string, RoutingRow>>;

export function parseTrace(text: string): Omit<RoutingResult, "elapsedMs"> {
  const fields = new Map<string, string>();
  for (const line of text.trim().split(/\r?\n/)) {
    const index = line.indexOf("=");
    if (index < 1) continue;
    const key = line.slice(0, index), value = line.slice(index + 1).trim();
    if (fields.has(key)) throw new Error("AMBIGUOUS_TRACE");
    fields.set(key, value);
  }
  const ip = parseIp(fields.get("ip") ?? "");
  if (!ip.isPublic) throw new Error("NON_PUBLIC_IP");
  const country = fields.get("loc") ?? "", colo = fields.get("colo") ?? "";
  return { address: ip.address, family: ip.family, country: /^[A-Z]{2}$/.test(country) ? country : null, colo: /^[A-Z]{3}$/.test(colo) ? colo : null };
}

/** A terminal/opaque response is never used to infer a browser's address. */
export async function detectTarget(target: RoutingTarget, signal: AbortSignal, { transport, now = () => performance.now(), timeoutMs = 5_000 }: { transport?: typeof fetch; now?: () => number; timeoutMs?: number } = {}): Promise<RoutingOutcome> {
  if ((!transport && typeof window === "undefined") || signal.aborted) return { ok: false, code: "CANCELLED" };
  const abort = new AbortController(), start = now();
  let settle!: (value: RoutingOutcome) => void;
  const stopped = new Promise<RoutingOutcome>(resolve => { settle = resolve; });
  const cancel = () => { settle({ ok: false, code: "CANCELLED" }); abort.abort(); };
  signal.addEventListener("abort", cancel, { once: true });
  if (signal.aborted) cancel();
  const timer = setTimeout(() => { settle({ ok: false, code: "TIMEOUT" }); abort.abort(); }, timeoutMs);
  const operation = async (): Promise<RoutingOutcome> => {
    const response = await (transport ?? fetch)(target.url, { method: target.format === "header" ? "HEAD" : "GET", signal: abort.signal, mode: "cors", credentials: "omit", cache: "no-store", redirect: "error", referrerPolicy: "no-referrer" });
    if (response.status === 429) return { ok: false, code: "RATE_LIMITED" };
    if (!response.ok || response.type === "opaque" || response.type === "opaqueredirect") return { ok: false, code: "UNAVAILABLE" };
    let data: Omit<RoutingResult, "elapsedMs">;
    if (target.format === "header") {
      let found: ReturnType<typeof parseIp> | undefined;
      for (const name of target.headers ?? []) {
        const value = response.headers.get(name);
        if (!value || value.length > 45) continue;
        try { const ip = parseIp(value); if (ip.isPublic) { found = ip; break; } } catch { /* Only a complete public literal is accepted. */ }
      }
      if (!found) return { ok: false, code: "NO_ADDRESS" };
      data = { address: found.address, family: found.family, country: null, colo: null };
    } else {
      if (!response.body || Number(response.headers.get("Content-Length")) > 4096) return { ok: false, code: "NO_ADDRESS" };
      const reader = response.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
      try {
        for (;;) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.byteLength; if (size > 4096) return { ok: false, code: "NO_ADDRESS" }; chunks.push(chunk.value); }
      } finally { await reader.cancel().catch(() => {}); }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      try { data = parseTrace(new TextDecoder().decode(bytes)); } catch { return { ok: false, code: "NO_ADDRESS" }; }
    }
    return { ok: true, data: { ...data, elapsedMs: Math.max(0, Math.round(now() - start)) } };
  };
  try { return await Promise.race([operation(), stopped]); }
  catch { return { ok: false, code: "UNAVAILABLE" }; }
  finally { clearTimeout(timer); signal.removeEventListener("abort", cancel); abort.abort(); }
}

export function createRoutingController({ targets = routingTargets, detect = detectTarget, concurrency = 5 }: { targets?: readonly RoutingTarget[]; detect?: (target: RoutingTarget, signal: AbortSignal) => Promise<RoutingOutcome>; concurrency?: number } = {}) {
  const initial: RoutingSnapshot = Object.fromEntries(targets.map(target => [target.id, { phase: "idle" }]));
  let state = initial, generation = 0, active = 0;
  const listeners = new Set<() => void>(), aborts = new Map<string, AbortController>(), versions = new Map<string, number>();
  const limit = Math.max(1, Math.min(8, Math.floor(concurrency) || 1));
  let queue: { target: RoutingTarget; generation: number; version: number }[] = [];
  const publish = (next: RoutingSnapshot) => { state = next; listeners.forEach(listener => listener()); };
  function pump() {
    while (active < limit && queue.length) {
      const job = queue.shift()!;
      if (job.generation !== generation || versions.get(job.target.id) !== job.version) continue;
      const abort = new AbortController(); aborts.set(job.target.id, abort); active++;
      publish({ ...state, [job.target.id]: { phase: "loading" } });
      void Promise.resolve().then(() => detect(job.target, abort.signal)).catch((): RoutingOutcome => ({ ok: false, code: "UNAVAILABLE" })).then(outcome => {
        if (job.generation === generation && versions.get(job.target.id) === job.version && !abort.signal.aborted) publish({ ...state, [job.target.id]: { phase: "done", outcome } });
      }).finally(() => { active--; if (aborts.get(job.target.id) === abort) aborts.delete(job.target.id); pump(); });
    }
  }
  function invalidate() { ++generation; queue = []; aborts.forEach(abort => abort.abort()); aborts.clear(); }
  return {
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => state, getServerSnapshot: () => initial,
    refresh() {
      invalidate();
      publish(Object.fromEntries(targets.map(target => [target.id, { phase: "queued" }])));
      queue = targets.map(target => { const version = (versions.get(target.id) ?? 0) + 1; versions.set(target.id, version); return { target, generation, version }; });
      pump();
    },
    retry(id: string) {
      const target = targets.find(item => item.id === id); if (!target) return;
      aborts.get(id)?.abort(); const version = (versions.get(id) ?? 0) + 1; versions.set(id, version);
      queue = queue.filter(job => job.target.id !== id); queue.push({ target, generation, version });
      publish({ ...state, [id]: { phase: "queued" } }); pump();
    },
    dispose() { invalidate(); },
  };
}

export function routingSummary(rows: RoutingSnapshot, targets: readonly RoutingTarget[] = routingTargets) {
  const exits = new Map<string, { result: RoutingResult; sites: number }>();
  let success = 0, done = 0, pending = 0;
  for (const target of targets) {
    const row = rows[target.id];
    if (row?.phase === "loading" || row?.phase === "queued") pending++;
    if (row?.phase !== "done") continue;
    done++;
    if (!row.outcome.ok) continue;
    success++;
    const result = row.outcome.data, existing = exits.get(result.address);
    if (existing) existing.sites++; else exits.set(result.address, { result, sites: 1 });
  }
  const groups = [...exits.values()];
  const ipv4 = groups.filter(group => group.result.family === "ipv4").length, ipv6 = groups.filter(group => group.result.family === "ipv6").length;
  return { groups, success, done, pending, ipv4, ipv6, different: ipv4 > 1 || ipv6 > 1 };
}

export function compareReference(result: RoutingResult, rows: RoutingSnapshot, targets: readonly RoutingTarget[] = routingTargets): "same" | "different" | "noReference" | "ambiguous" {
  const addresses = new Set(targets.filter(target => target.group === "reference").flatMap(target => {
    const row = rows[target.id];
    return row?.phase === "done" && row.outcome.ok && row.outcome.data.family === result.family ? [row.outcome.data.address] : [];
  }));
  if (!addresses.size) return "noReference";
  if (addresses.size > 1) return "ambiguous";
  return addresses.has(result.address) ? "same" : "different";
}
