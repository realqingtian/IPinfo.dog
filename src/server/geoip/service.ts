import { parseIp } from "../../lib/ip.ts";
import type { IpInformation } from "../../lib/contracts/ip.ts";
import { GeoIpError } from "./errors.ts";
import { normalizeRecord, type LookupMaterial, type QueryableDataset } from "./normalize.ts";

export const lookupPolicy = Object.freeze({ ttlMs: 300_000, maxEntries: 512, timeoutMs: 10_000 });

async function withDeadline<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([promise, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new GeoIpError("TIMEOUT")), timeoutMs);
    })]);
  } finally { clearTimeout(timer); }
}

export function createLookupService({ getDataset, now = Date.now,
  ttlMs = lookupPolicy.ttlMs, maxEntries = lookupPolicy.maxEntries, timeoutMs = lookupPolicy.timeoutMs }: {
  getDataset: () => Promise<QueryableDataset>;
  now?: () => number; ttlMs?: number; maxEntries?: number; timeoutMs?: number;
}) {
  const cache = new Map<string, { expires: number; data: LookupMaterial }>();
  let datasetId: string | undefined;
  return {
    async lookup(input: string): Promise<IpInformation> {
      let parsed;
      try { parsed = parseIp(input); } catch { throw new GeoIpError("INVALID_IP"); }
      if (!parsed.isPublic) throw new GeoIpError("NON_PUBLIC_IP", parsed.scope);
      try {
        const dataset = await withDeadline(getDataset(), timeoutMs);
        if (dataset.id !== datasetId) { cache.clear(); datasetId = dataset.id; }
        const time = now();
        const key = `${dataset.id}:${parsed.address}`;
        let entry = cache.get(key);
        if (entry && entry.expires <= time) { cache.delete(key); entry = undefined; }
        if (!entry) {
          entry = { data: normalizeRecord(dataset, parsed), expires: time + ttlMs };
          if (maxEntries > 0) {
            cache.set(key, entry);
            while (cache.size > maxEntries) cache.delete(cache.keys().next().value!);
          }
        } else { cache.delete(key); cache.set(key, entry); }
        // Cached facts are language-neutral. Each request gets its own timestamp and copy.
        return { ...structuredClone(entry.data), queriedAt: new Date(time).toISOString() };
      } catch (error) {
        if (error instanceof GeoIpError) throw error;
        throw new GeoIpError("DATA_UNAVAILABLE");
      }
    },
  };
}
