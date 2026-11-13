import { routingPolicy, type RoutingOutcome, type RoutingMeasurement, type RoutingError } from "./probe.ts";
import type { RoutingTarget } from "./catalog.ts";

export type RoutingState = { phase: "idle" | "queued" | "running" | "success" | "error" | "cancelled"; measurement: RoutingMeasurement | null; error: RoutingError | null; status?: number };
export type RoutingSnapshot = Readonly<Record<string, RoutingState>>;
type Job = { target: RoutingTarget; version: number; abort: AbortController };
const empty = (): RoutingState => ({ phase: "idle", measurement: null, error: null });

export function groupExits(targets: readonly RoutingTarget[], state: RoutingSnapshot) {
  const groups = new Map<string, { address: string; family: "ipv4" | "ipv6"; targets: RoutingTarget[] }>();
  for (const target of targets) {
    const slot = state[target.id]; if (slot?.phase !== "success" || !slot.measurement) continue;
    const { address, family } = slot.measurement, key = `${family}:${address}`;
    const group = groups.get(key) ?? { address, family, targets: [] }; group.targets.push(target); groups.set(key, group);
  }
  const entries = [...groups.values()].sort((a, b) => a.family.localeCompare(b.family) || a.address.localeCompare(b.address));
  return { groups: entries, multipleExits: entries.filter(g => g.family === "ipv4").length > 1 || entries.filter(g => g.family === "ipv6").length > 1 };
}

export function createRoutingController({ targets, probe, concurrency = routingPolicy.concurrency }: {
  targets: readonly RoutingTarget[]; probe: (target: RoutingTarget, signal: AbortSignal) => Promise<RoutingOutcome>; concurrency?: number;
}) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > routingPolicy.concurrency || new Set(targets.map(t => t.id)).size !== targets.length) throw new Error("INVALID_ROUTING_CONFIGURATION");
  const initial: RoutingSnapshot = Object.fromEntries(targets.map(t => [t.id, empty()]));
  let snapshot = initial, queue: Job[] = [], disposed = false;
  const versions = new Map(targets.map(t => [t.id, 0])), running = new Set<Job>(), listeners = new Set<() => void>();
  const current = (job: Job) => !disposed && versions.get(job.target.id) === job.version;
  const publish = (id: string, slot: RoutingState) => { snapshot = { ...snapshot, [id]: slot }; listeners.forEach(listener => listener()); };
  function pump() {
    while (!disposed && running.size < concurrency && queue.length) {
      const job = queue.shift()!; if (!current(job) || job.abort.signal.aborted) continue;
      running.add(job); publish(job.target.id, { phase: "running", measurement: null, error: null });
      void Promise.resolve().then(() => current(job) && !job.abort.signal.aborted ? probe(job.target, job.abort.signal) : Promise.resolve<RoutingOutcome>({ ok: false, code: "CANCELLED" }))
        .catch((): RoutingOutcome => ({ ok: false, code: "REQUEST_FAILED" })).then(outcome => {
          if (current(job)) publish(job.target.id, outcome.ok ? { phase: "success", measurement: outcome.measurement, error: null }
            : { phase: outcome.code === "CANCELLED" ? "cancelled" : "error", measurement: null, error: outcome.code, status: outcome.status });
        }).finally(() => { running.delete(job); pump(); });
    }
  }
  function run(ids: readonly string[]) {
    disposed = false;
    for (const id of new Set(ids)) {
      const target = targets.find(t => t.id === id); if (!target) continue;
      const version = (versions.get(id) ?? 0) + 1; versions.set(id, version);
      for (const job of [...running, ...queue]) if (job.target.id === id) job.abort.abort();
      queue = queue.filter(job => job.target.id !== id);
      queue.push({ target, version, abort: new AbortController() }); publish(id, { phase: "queued", measurement: null, error: null });
    }
    pump();
  }
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => snapshot, getServerSnapshot: () => initial,
    retry(id: string) { run([id]); }, runAll() { run(targets.map(t => t.id)); },
    cancel() {
      for (const target of targets) if (["queued", "running"].includes(snapshot[target.id].phase)) {
        versions.set(target.id, versions.get(target.id)! + 1); publish(target.id, { phase: "cancelled", measurement: null, error: "CANCELLED" });
      }
      for (const job of [...queue, ...running]) job.abort.abort(); queue = [];
    },
    dispose() { disposed = true; for (const target of targets) versions.set(target.id, versions.get(target.id)! + 1); for (const job of [...queue, ...running]) job.abort.abort(); queue = []; },
  };
}
