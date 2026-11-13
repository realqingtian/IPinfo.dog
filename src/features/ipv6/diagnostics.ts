import { fetchExit, type BasicExit, type ProbeOutcome } from "../ip/exit.ts";

export const diagnosticKeys = ["ipv4", "ipv6", "connection"] as const;
export type DiagnosticKey = typeof diagnosticKeys[number];
export type Measurement = { data: BasicExit; elapsedMs: number };
export type DiagnosticOutcome = { ok: true; measurement: Measurement } | { ok: false; code: "TIMEOUT" | "DETECTION_FAILED" | "RATE_LIMITED" };
export type DiagnosticState = { phase: "idle" | "running" | "success" | "error" | "cancelled"; measurement: Measurement | null; error: string | null };
export type DiagnosticSnapshot = Record<DiagnosticKey, DiagnosticState>;
const empty = (): DiagnosticState => ({ phase: "idle", measurement: null, error: null });

/** Measures a complete HTTPS fetch, not ICMP latency or a native interface. */
export async function measureProbe(url: string, key: DiagnosticKey, signal: AbortSignal, {
  probe = fetchExit, clock = () => performance.now(),
}: { probe?: (url: string, family: "ipv4" | "ipv6" | "any", signal: AbortSignal) => Promise<ProbeOutcome>; clock?: () => number } = {}): Promise<DiagnosticOutcome> {
  const start = clock();
  const outcome = await probe(url, key === "connection" ? "any" : key, signal);
  if (!outcome.ok) return outcome;
  return { ok: true, measurement: { data: outcome.data, elapsedMs: Math.max(0, Math.round(clock() - start)) } };
}

/** One failed endpoint never proves the absence of a network protocol. */
export function readiness(snapshot: DiagnosticSnapshot) {
  if (snapshot.ipv4.phase === "success" && snapshot.ipv6.phase === "success") return "dual";
  if (snapshot.ipv4.phase === "success") return "v4Observed";
  if (snapshot.ipv6.phase === "success") return "v6Observed";
  if (diagnosticKeys.some((key) => snapshot[key].phase === "running")) return "running";
  return "unconfirmed";
}

export function createDiagnostics({ measure }: { measure: (key: DiagnosticKey, signal: AbortSignal) => Promise<DiagnosticOutcome> }) {
  const initial: DiagnosticSnapshot = { ipv4: empty(), ipv6: empty(), connection: empty() };
  let snapshot = initial;
  const listeners = new Set<() => void>();
  const generations: Record<DiagnosticKey, number> = { ipv4: 0, ipv6: 0, connection: 0 };
  const requests = new Map<DiagnosticKey, AbortController>();
  const publish = (key: DiagnosticKey, state: DiagnosticState) => {
    snapshot = { ...snapshot, [key]: state }; listeners.forEach((listener) => listener());
  };
  const run = (key: DiagnosticKey) => {
    const generation = ++generations[key]; requests.get(key)?.abort();
    const abort = new AbortController(); requests.set(key, abort);
    publish(key, { phase: "running", measurement: null, error: null });
    void Promise.resolve().then(() => measure(key, abort.signal)).catch((): DiagnosticOutcome => ({ ok: false, code: "DETECTION_FAILED" })).then((outcome) => {
      if (generation !== generations[key]) return;
      requests.delete(key);
      publish(key, outcome.ok ? { phase: "success", measurement: outcome.measurement, error: null } : { phase: "error", measurement: null, error: outcome.code });
    });
  };
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => snapshot, getServerSnapshot: () => initial,
    run, runAll() { diagnosticKeys.forEach(run); },
    cancel() {
      for (const [key, abort] of requests) {
        ++generations[key]; abort.abort(); publish(key, { phase: "cancelled", measurement: null, error: null });
      }
      requests.clear();
    },
    dispose() { for (const [key, abort] of requests) { ++generations[key]; abort.abort(); } requests.clear(); },
  };
}
