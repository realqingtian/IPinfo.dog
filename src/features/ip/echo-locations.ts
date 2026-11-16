import type { IpInformation } from "../../lib/contracts/ip.ts";
import type { LookupOutcome } from "./query.ts";

export type EchoLocation = { phase: "loading" } | { phase: "done"; outcome: LookupOutcome };

/** Each observed address shares one local-MMDB lookup across all source rows. */
export function createEchoLocations(lookup: (address: string, signal: AbortSignal) => Promise<LookupOutcome>) {
  let state: Record<string, EchoLocation> = {};
  const requests = new Map<string, AbortController>();
  const listeners = new Set<() => void>();
  const publish = () => { state = { ...state }; listeners.forEach(listener => listener()); };
  function start(address: string) {
    const abort = new AbortController();
    requests.set(address, abort);
    state[address] = { phase: "loading" };
    void lookup(address, abort.signal).catch((): LookupOutcome => ({ ok: false, code: "DATA_UNAVAILABLE", retryable: true })).then(outcome => {
      if (requests.get(address) !== abort || abort.signal.aborted) return;
      requests.delete(address);
      state[address] = { phase: "done", outcome };
      publish();
    });
  }
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => state,
    sync(addresses: string[], primary?: IpInformation | null, pendingAddress?: string) {
      const wanted = new Set(addresses);
      for (const [address, abort] of requests) {
        if (!wanted.has(address) || address === primary?.address) {
          abort.abort();
          requests.delete(address);
          delete state[address];
        }
      }
      if (primary && wanted.has(primary.address)) state[primary.address] = { phase: "done", outcome: { ok: true, data: primary } };
      for (const address of wanted) if (!state[address] && address !== pendingAddress) start(address);
      publish();
    },
    retry(address: string) {
      if (requests.has(address)) return;
      start(address);
      publish();
    },
    dispose() {
      for (const [address, abort] of requests) {
        abort.abort();
        delete state[address];
      }
      requests.clear();
    },
  };
}
