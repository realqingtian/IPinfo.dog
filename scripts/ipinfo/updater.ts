import { copyFile, mkdir, mkdtemp, open, readdir, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { loadIpinfo, readIpinfoState, type IpinfoDataset } from "../../src/server/ipinfo/database.ts";
import type { UpdateState } from "../../src/server/geoip/update-state.ts";
async function writeState(root: string, value: UpdateState) {
  const path = join(root, `.state-${process.pid}-${randomBytes(6).toString("hex")}.json`);
  try { const file = await open(path, "wx", 0o644); try { await file.writeFile(JSON.stringify(value) + "\n"); await file.sync(); } finally { await file.close(); }
    await rename(path, join(root, "state.json")); const directory = await open(root, "r"); try { await directory.sync(); } finally { await directory.close(); }
  } finally { await rm(path, { force: true }); }
}
export async function runIpinfoUpdate({ root, acquire, validate = loadIpinfo, now = Date.now }: {
  root: string; acquire: (stage: string) => Promise<void>; validate?: (directory: string, now: number) => Promise<IpinfoDataset>; now?: () => number;
}) {
  await mkdir(join(root, "releases"), { recursive: true });
  // Caller holds host flock; only our staging prefix may be removed.
  for (const name of await readdir(root)) if (name.startsWith(".candidate-")) await rm(join(root, name), { recursive: true, force: true });
  const stage = await mkdtemp(join(root, ".candidate-")); let previous: UpdateState | undefined, published = false;
  try { previous = await readIpinfoState(root); } catch { /* First acquisition. */ }
  try {
    const oldPath = previous ? join(root, "releases", previous.folder ?? previous.active) : null;
    const old = oldPath ? await validate(oldPath, now()).catch(() => null) : null;
    if (oldPath) await copyFile(join(oldPath, "ipinfo_lite.mmdb"), join(stage, "ipinfo_lite.mmdb")).catch(() => {});
    await acquire(stage); const next = await validate(stage, now());
    if (old && Date.parse(next.buildTime) < Date.parse(old.buildTime)) throw Error("DATABASE_REGRESSION");
    const changed = next.id !== previous?.active, repaired = !changed && old?.id !== next.id;
    const folder = changed || repaired ? `${next.id}-${randomBytes(6).toString("hex")}` : previous!.folder ?? previous!.active;
    if (changed || repaired) await rename(stage, join(root, "releases", folder));
    const at = new Date(now()).toISOString(); await writeState(root, { schema: 1, active: next.id, folder, lastAttemptAt: at, lastSuccessAt: at, outcome: changed || repaired ? "updated" : "unchanged" }); published = true;
    for (const name of await readdir(join(root, "releases"))) if (/^[a-f0-9]{64}(?:-[a-f0-9]{12})?$/.test(name) && name !== folder) await rm(join(root, "releases", name), { recursive: true, force: true }).catch(() => {});
    return { ok: true, changed, repaired, datasetId: next.id, buildTime: next.buildTime };
  } catch {
    if (previous && !published) await writeState(root, { ...previous, lastAttemptAt: new Date(now()).toISOString(), outcome: "failed" });
    throw Error("UPDATE_FAILED");
  } finally { await rm(stage, { recursive: true, force: true }); }
}
