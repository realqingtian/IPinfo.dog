import { loadDataset } from "./dataset.ts";
import { GeoIpError } from "./errors.ts";
import type { QueryableDataset } from "./normalize.ts";

/** One initial load shared by lookup and readiness; failures back off instead of thrashing disk. */
export function createDatasetProvider({ directory, load = loadDataset, now = Date.now, cooldownMs = 5_000 }: {
  directory: () => string | undefined;
  load?: (path: string) => Promise<QueryableDataset>;
  now?: () => number;
  cooldownMs?: number;
}) {
  let active: QueryableDataset | undefined;
  let pending: Promise<QueryableDataset> | undefined;
  let retryAt = 0;
  async function get(): Promise<QueryableDataset> {
    if (active) return active;
    const path = directory();
    if (!path || now() < retryAt) throw new GeoIpError("DATA_UNAVAILABLE");
    pending ??= Promise.resolve().then(() => load(path)).then((dataset) => {
      active = dataset;
      return dataset;
    }).catch(() => {
      retryAt = now() + cooldownMs;
      throw new GeoIpError("DATA_UNAVAILABLE");
    }).finally(() => { pending = undefined; });
    return pending;
  }
  return { get, configured: () => !!directory() };
}
