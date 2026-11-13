import { parseIp } from "../../lib/ip.ts";
import type { IpInformation } from "../../lib/contracts/ip.ts";
import type { LookupOutcome } from "./query.ts";
export type Family = "ipv4" | "ipv6";
export type BasicExit = { address: string; family: Family; detectedAt: string };
export type ProbeOutcome = { ok: true; data: BasicExit } | { ok: false; code: "TIMEOUT" | "DETECTION_FAILED" | "RATE_LIMITED" };
export type ExitState = { phase: "detecting" | "details" | "ready" | "error"; basic: BasicExit | null; information: IpInformation | null; error: string | null };

export async function fetchExit(url: string, family: Family | "any", signal: AbortSignal, transport: typeof fetch = fetch, timeoutMs = 5_000): Promise<ProbeOutcome> {
  const abort = new AbortController(), cancel = () => abort.abort(); signal.addEventListener("abort", cancel, { once: true }); if (signal.aborted) cancel();
  let timer: ReturnType<typeof setTimeout> | undefined, timedOut = false;
  try {
    const operation = (async (): Promise<ProbeOutcome> => {
      const response = await transport(url, { signal: abort.signal, cache: "no-store", credentials: "omit", mode: "cors", referrerPolicy: "no-referrer" });
      if (response.status === 429) return { ok: false, code: "RATE_LIMITED" };
      const body = await response.json();
      if (!response.ok || body?.ok !== true || typeof body.data?.address !== "string" || typeof body.data?.detectedAt !== "string" || !Number.isFinite(Date.parse(body.data.detectedAt))) return { ok: false, code: "DETECTION_FAILED" };
      const parsed = parseIp(body.data.address);
      if (!parsed.isPublic || (family !== "any" && parsed.family !== family) || body.data.family !== parsed.family) return { ok: false, code: "DETECTION_FAILED" };
      return { ok: true, data: { address: parsed.address, family: parsed.family, detectedAt: body.data.detectedAt } };
    })();
    return await Promise.race([operation, new Promise<ProbeOutcome>((resolve) => { timer = setTimeout(() => { timedOut = true; abort.abort(); resolve({ ok: false, code: "TIMEOUT" }); }, timeoutMs); })]);
  } catch { return { ok: false, code: timedOut ? "TIMEOUT" : "DETECTION_FAILED" }; }
  finally { clearTimeout(timer); signal.removeEventListener("abort", cancel); }
}
export function createExitController({ probe, lookup }: { probe: (signal: AbortSignal) => Promise<ProbeOutcome>; lookup: (address: string, signal: AbortSignal) => Promise<LookupOutcome> }) {
  const initial: ExitState = { phase: "detecting", basic: null, information: null, error: null };
  let state = initial, generation = 0, abort: AbortController | undefined;
  const listeners = new Set<() => void>();
  const publish = (value: ExitState) => { state = value; listeners.forEach((listener) => listener()); };
  async function details(basic: BasicExit, current: number, signal: AbortSignal) {
    const result = await lookup(basic.address, signal).catch((): LookupOutcome => ({ ok: false, code: "DATA_UNAVAILABLE", retryable: true }));
    if (current !== generation) return;
    publish({ phase: result.ok ? "ready" : "error", basic, information: result.ok ? result.data : null, error: result.ok ? null : result.code });
  }
  return {
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, getSnapshot: () => state, getServerSnapshot: () => initial,
    refresh() {
      const current = ++generation; abort?.abort(); const active = abort = new AbortController(); publish(initial);
      void probe(active.signal).catch((): ProbeOutcome => ({ ok: false, code: "DETECTION_FAILED" })).then((result) => {
        if (current !== generation) return;
        if (!result.ok) { publish({ phase: "error", basic: null, information: null, error: result.code }); return; }
        publish({ phase: "details", basic: result.data, information: null, error: null });
        void details(result.data, current, active.signal);
      });
    },
    retryDetails() { if (!state.basic) return; const current = ++generation, basic = state.basic; abort?.abort(); abort = new AbortController(); publish({ phase: "details", basic, information: null, error: null }); void details(basic, current, abort.signal); },
    dispose() { ++generation; abort?.abort(); },
  };
}
