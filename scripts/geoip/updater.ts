import { copyFile, mkdir, mkdtemp, open, readdir, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { loadDataset, editions } from "../../src/server/geoip/dataset.ts";
import { readUpdateState } from "../../src/server/geoip/managed.ts";
import type { UpdateState } from "../../src/server/geoip/update-state.ts";
import type { QueryableDataset } from "../../src/server/geoip/normalize.ts";

export async function writeState(root: string, state: UpdateState) {
  const path = join(root, `.state-${process.pid}-${Date.now()}.json`);
  try {
    const file = await open(path, "wx", 0o644);
    try { await file.writeFile(JSON.stringify(state) + "\n"); await file.sync(); } finally { await file.close(); }
    await rename(path, join(root, "state.json"));
    const directory = await open(root, "r"); try { await directory.sync(); } finally { await directory.close(); }
  }
  finally { await rm(path, { force: true }); }
}
export async function validateCandidate(path: string, now: number) {
  const value = await loadDataset(path);
  for (const edition of editions) {
    const reader = value.readers[edition];
    const time = Date.parse(reader.buildTime);
    if (!Number.isFinite(time) || time < Date.UTC(2000, 0, 1) || time > now + 24 * 60 * 60_000) throw new Error("INVALID_DATABASE_TIME");
    for (const ip of ["8.8.8.8", "2001:4860:4860::8888"]) {
      const record = reader.reader.get(ip);
      if (!record || (edition === "GeoLite2-ASN" ? !("autonomous_system_number" in record) || !Number.isInteger(record.autonomous_system_number)
        : !("country" in record) && !("registered_country" in record))) throw new Error("SAMPLE_QUERY_FAILED");
    }
  }
  return value;
}
/** Caller holds the host flock for the entire container lifetime, including cleanup. */
export async function runUpdate({ root, download, validate = validateCandidate, loadExisting = loadDataset, now = Date.now }: {
  root: string; download: (stage: string) => Promise<void>;
  validate?: (path: string, time: number) => Promise<QueryableDataset>; now?: () => number;
  loadExisting?: (path: string) => Promise<QueryableDataset>;
}) {
  await mkdir(join(root, "releases"), { recursive: true });
  // Only our staging prefix is eligible; an interrupted invocation cannot be active.
  for (const file of await readdir(root)) if (file.startsWith(".candidate-")) await rm(join(root, file), { recursive: true, force: true });
  const stage = await mkdtemp(join(root, ".candidate-"));
  let previous: UpdateState | undefined;
  let published = false;
  try { previous = await readUpdateState(root); } catch { /* Initial migration has no managed state. */ }
  try {
    const source = previous ? join(root, "releases", previous.folder ?? previous.active) : root;
    for (const edition of editions) {
      try { await copyFile(join(source, `${edition}.mmdb`), join(stage, `${edition}.mmdb`)); }
      catch { /* The official tool can acquire missing files; never publish a partial set. */ }
    }
    await download(stage);
    const candidate = await validate(stage, now());
    const old = previous ? await loadExisting(source).catch(() => null) : null;
    if (previous) {
      if (old && editions.some((e) => Date.parse(candidate.readers[e].buildTime) < Date.parse(old.readers[e].buildTime))) throw new Error("DATABASE_REGRESSION");
    }
    const changed = candidate.id !== previous?.active;
    const repaired = !changed && old?.id !== candidate.id;
    // Same content may need a new physical generation after disk corruption.
    // Never mutate the directory selected by the current atomic state pointer.
    const folder = repaired ? `${candidate.id}-${randomBytes(6).toString("hex")}` : changed ? candidate.id : previous!.folder ?? candidate.id;
    if (changed || repaired) {
      const destination = join(root, "releases", folder);
      // An unreferenced directory may remain after a crash before state publication.
      await rm(destination, { recursive: true, force: true });
      await rename(stage, destination);
    }
    const checkedAt = new Date(now()).toISOString();
    await writeState(root, { schema: 1, active: candidate.id, folder, lastAttemptAt: checkedAt, lastSuccessAt: checkedAt, outcome: changed || repaired ? "updated" : "unchanged" });
    published = true;
    // All readers are buffers; old in-flight snapshots remain valid after unlinking.
    for (const file of await readdir(join(root, "releases"))) if (/^[a-f0-9]{64}(?:-[a-f0-9]{12})?$/.test(file) && file !== folder) await rm(join(root, "releases", file), { recursive: true, force: true }).catch(() => { /* Retry cleanup next run, never rewind published state. */ });
    return { ok: true, changed, repaired, datasetId: candidate.id };
  } catch {
    if (previous && !published) await writeState(root, { ...previous, lastAttemptAt: new Date(now()).toISOString(), outcome: "failed" });
    throw new Error("UPDATE_FAILED");
  } finally { await rm(stage, { recursive: true, force: true }); }
}
