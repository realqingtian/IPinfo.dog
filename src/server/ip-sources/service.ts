import type { ExtraSourceId, SourceOutcome, SourceRecord } from "../../lib/contracts/ip-sources.ts";
import { SourceError, safeSourceError } from "./error.ts";

/** Bounded process cache + in-flight coalescing; failures have a short cooldown. */
export function createSourceService({ sources, now = Date.now, ttlMs = 300_000, maxEntries = 512, concurrency = 4 }: {
  sources: Record<ExtraSourceId, (address: string) => Promise<SourceRecord>>;
  now?: () => number; ttlMs?: number; maxEntries?: number; concurrency?: number;
}) {
  const cache = new Map<string, { expires: number; outcome: SourceOutcome }>();
  const pending = new Map<string, Promise<SourceOutcome>>();
  return {
    async lookup(source: ExtraSourceId, address: string): Promise<SourceOutcome> {
      const key = `${source}:${address}`, entry = cache.get(key);
      if (entry && entry.expires > now()) return structuredClone(entry.outcome);
      cache.delete(key);
      const running = pending.get(key); if (running) return structuredClone(await running);
      if (pending.size >= concurrency) return { ok: false, code: "RATE_LIMITED" };
      const work = Promise.resolve().then(() => sources[source](address)).then((data): SourceOutcome => {
        if (data.address !== address || data.source !== source) throw new SourceError("UNAVAILABLE");
        return { ok: true, data };
      }).catch((error): SourceOutcome => ({ ok: false, code: safeSourceError(error) })).then((outcome) => {
        cache.set(key, { expires: now() + (outcome.ok ? ttlMs : 15_000), outcome });
        while (cache.size > maxEntries) cache.delete(cache.keys().next().value!);
        return outcome;
      }).finally(() => pending.delete(key));
      pending.set(key, work);
      return structuredClone(await work);
    },
  };
}
