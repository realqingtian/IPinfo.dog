import { extraSourceIds, type ExtraSourceId, type SourceOutcome } from "../../lib/contracts/ip-sources.ts";
import { fetchSource as fetchOnlineSource } from "./source-client.ts";
import { fetchLocalIpinfo } from "./local-source-client.ts";
export const fetchSource = (id: ExtraSourceId, address: string, signal: AbortSignal, force = false): Promise<SourceOutcome> => id === "ipinfo" ? fetchLocalIpinfo(address, signal) : fetchOnlineSource(id, address, signal, force);
export type SourceRowState = { phase: "loading" } | { phase: "done"; outcome: SourceOutcome };
export function createSourcesController(address: string, lookup = fetchSource, ids: readonly ExtraSourceId[] = extraSourceIds) {
  const initial = Object.fromEntries(extraSourceIds.map(id => [id, { phase: "loading" }])) as Record<ExtraSourceId, SourceRowState>;
  let state = initial;
  const listeners = new Set<() => void>(), generations = Object.fromEntries(extraSourceIds.map(id => [id, 0])) as Record<ExtraSourceId, number>, aborts = new Map<ExtraSourceId, AbortController>();
  const publish = (id: ExtraSourceId, row: SourceRowState) => { state = { ...state, [id]: row }; listeners.forEach(fn => fn()); };
  function retry(id: ExtraSourceId, force = true) {
    if (!ids.includes(id)) return;
    const generation = ++generations[id]; aborts.get(id)?.abort(); const abort = new AbortController(); aborts.set(id, abort);
    publish(id, { phase: "loading" });
    void lookup(id, address, abort.signal, force).catch((): SourceOutcome => ({ ok: false, code: "UNAVAILABLE" })).then(outcome => {
      if (generations[id] === generation && !abort.signal.aborted) publish(id, { phase: "done", outcome });
    });
  }
  return { subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
    getSnapshot: () => state, getServerSnapshot: () => initial, retry,
    refresh: (force = false) => ids.forEach(id => retry(id, force)),
    dispose: () => { extraSourceIds.forEach(id => { ++generations[id]; aborts.get(id)?.abort(); }); },
  };
}
