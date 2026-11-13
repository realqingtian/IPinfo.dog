import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadDataset } from "./dataset.ts";
import { GeoIpError } from "./errors.ts";
import type { QueryableDataset } from "./normalize.ts";
import { parseUpdateState, updateStatus, type UpdateState, type UpdateStatus } from "./update-state.ts";

export async function readUpdateState(root: string) {
  const text = await readFile(join(root, "state.json"), "utf8");
  if (text.length > 4096) throw new Error("INVALID_UPDATE_STATE");
  return parseUpdateState(JSON.parse(text));
}
/** Readers own complete buffers: retained request snapshots never depend on retired files. */
export function createManagedDatasetProvider({ directory, read = readUpdateState, load = loadDataset, now = Date.now }: {
  directory: () => string | undefined; read?: (root: string) => Promise<UpdateState>;
  load?: (path: string) => Promise<QueryableDataset>; now?: () => number;
}) {
  let active: QueryableDataset | undefined, confirmedAt: string | null = null;
  let pending: { id: string; promise: Promise<QueryableDataset> } | undefined;
  let retryAt = 0, failedId: string | undefined;
  let status: UpdateStatus = { state: "unavailable", lastCheckedAt: null };
  async function refresh(retries = 1): Promise<UpdateStatus> {
    const root = directory();
    try {
      if (!root) throw new Error("NOT_CONFIGURED");
      const state = await read(root);
      if (updateStatus(state.lastSuccessAt, now()).state === "unavailable") throw new Error("INVALID_CHECK_TIME");
      const folder = state.folder ?? state.active;
      if (state.active !== active?.id) {
        if (failedId === folder && now() < retryAt) throw new Error("RELOAD_BACKOFF");
        if (!pending || pending.id !== folder) pending = { id: folder, promise: load(join(root, "releases", folder)) };
        const attempt = pending;
        try {
          const next = await attempt.promise;
          if (next.id !== state.active) throw new Error("DATASET_ID_MISMATCH");
          // A concurrent publication can retire the captured files. Re-read before activating.
          const latest = await read(root);
          if (latest.active !== state.active || (latest.folder ?? latest.active) !== folder) {
            if (!retries) throw new Error("PUBLICATION_CHANGED");
            return refresh(retries - 1);
          }
          active = next; failedId = undefined;
        } catch (error) { failedId = folder; retryAt = now() + 5_000; throw error; }
        finally { if (pending === attempt) pending = undefined; }
      }
      confirmedAt = state.lastSuccessAt;
      status = updateStatus(confirmedAt, now());
    } catch {
      status = updateStatus(confirmedAt, now());
      if (status.state === "current") status = { ...status, state: "warning" };
    }
    return status;
  }
  return {
    configured: () => !!directory(),
    async status() { return refresh(); },
    async get(): Promise<QueryableDataset> {
      await refresh();
      if (!active || ["expired", "unavailable"].includes(status.state)) throw new GeoIpError("DATA_UNAVAILABLE");
      return active;
    },
  };
}
