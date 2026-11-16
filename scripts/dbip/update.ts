import { mkdir, readFile, writeFile, rename, rm } from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { join, resolve } from "node:path";
import { loadDbipDataset } from "../../src/server/ip-sources/dbip.ts";

/** Downloads only DB-IP's official monthly Lite MMDB archives; no URL input is accepted. */
export async function updateDbip(directory: string, month: string, transport = fetch) {
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)) throw Error("INVALID_MONTH");
  const root = resolve(directory);
  await mkdir(join(root, "releases"), { recursive: true });
  const now = Date.now();
  try {
    const state = JSON.parse(await readFile(join(root, "state.json"), "utf8"));
    if (state.month === month && typeof state.generation === "string") {
      // Revalidate content, not just the pointer; same-content repair publishes a fresh folder.
      await loadDbipDataset(root, state.generation, now);
      return { changed: false, month, generation: state.generation };
    }
  } catch { /* Missing / corrupt candidate must not replace the active pointer until repaired. */ }
  const hashes: string[] = [], files: Buffer[] = [];
  for (const kind of ["city", "asn"] as const) {
    const response = await transport(`https://download.db-ip.com/free/dbip-${kind}-lite-${month}.mmdb.gz`, {
      redirect: "error", signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok || !response.body || Number(response.headers.get("Content-Length")) > 128 * 1024 * 1024) throw Error("DOWNLOAD_FAILED");
    const chunks: Uint8Array[] = []; let size = 0;
    const reader = response.body.getReader();
    try {
      for (;;) { const chunk = await reader.read(); if (chunk.done) break;
        size += chunk.value.byteLength; if (size > 128 * 1024 * 1024) throw Error("DOWNLOAD_TOO_LARGE"); chunks.push(chunk.value);
      }
    } finally { await reader.cancel().catch(() => {}); }
    const bytes = gunzipSync(Buffer.concat(chunks), { maxOutputLength: 256 * 1024 * 1024 });
    files.push(bytes); hashes.push(createHash("sha256").update(bytes).digest("hex"));
  }
  const hash = createHash("sha256").update(hashes.join(":")).digest("hex");
  const generation = `${hash}-${randomBytes(6).toString("hex")}`, folder = join(root, "releases", generation);
  await mkdir(folder);
  const temporaryState = join(root, `.state-${randomBytes(6).toString("hex")}.json`);
  try {
    await writeFile(join(folder, "city.mmdb"), files[0]); await writeFile(join(folder, "asn.mmdb"), files[1]);
    const dataset = await loadDbipDataset(root, generation, now);
    for (const reader of [dataset.city, dataset.asn]) {
      if (reader.metadata.buildEpoch.toISOString().slice(0, 7) !== month) throw Error("MONTH_MISMATCH");
      for (const ip of ["8.8.8.8", "2001:4860:4860::8888"]) if (!reader.get(ip)) throw Error("SAMPLE_NOT_FOUND");
    }
    await writeFile(temporaryState, JSON.stringify({ generation, month, checkedAt: new Date(now).toISOString() }) + "\n");
    await rename(temporaryState, join(root, "state.json"));
    return { changed: true, month, generation };
  } catch (error) {
    await rm(temporaryState, { force: true }); await rm(folder, { recursive: true, force: true }); throw error;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const directory = process.env.DBIP_DATABASE_DIR;
  if (!directory) { console.error("Set DBIP_DATABASE_DIR outside the image"); process.exitCode = 1; }
  else try { console.log(JSON.stringify(await updateDbip(directory, new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 7)))); }
  catch { console.error("DB-IP update failed; existing state retained"); process.exitCode = 1; }
}
