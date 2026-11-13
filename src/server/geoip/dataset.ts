import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Reader, type Response } from "maxmind";
import { parseIp } from "../../lib/ip.ts";

export const editions = ["GeoLite2-City", "GeoLite2-Country", "GeoLite2-ASN"] as const;
export type Edition = (typeof editions)[number];

/** A candidate is published only after all three in-memory readers validate. */
export async function loadDataset(directory: string) {
  const entries = await Promise.all(editions.map(async (edition) => {
    const bytes = await readFile(join(directory, `${edition}.mmdb`));
    const reader = new Reader<Response>(bytes);
    if (reader.metadata.databaseType !== edition || reader.metadata.ipVersion !== 6) {
      throw new Error("INVALID_DATABASE_TYPE");
    }
    return [edition, {
      reader,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      buildTime: reader.metadata.buildEpoch.toISOString(),
    }] as const;
  }));
  const readers = Object.fromEntries(entries) as Record<Edition, (typeof entries)[number][1]>;
  const id = createHash("sha256").update(entries.map(([, item]) => item.sha256).join(":"))
    .digest("hex");
  // readFile closes its descriptor; no per-file watcher can cause a mixed reload.
  return Object.freeze({ id, readers: Object.freeze(readers) });
}

export function queryDataset(
  dataset: Awaited<ReturnType<typeof loadDataset>>,
  edition: Edition,
  input: string,
) {
  // Reader.get alone can return null for malformed input; validate at our boundary.
  const { address } = parseIp(input);
  return dataset.readers[edition].reader.get(address);
}
