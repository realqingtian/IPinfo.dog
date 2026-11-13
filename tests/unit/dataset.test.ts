import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadDataset, editions } from "../../src/server/geoip/dataset.ts";

test("missing or corrupt candidate fails without creating a dataset", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ipinfo-invalid-mmdb-"));
  try {
    await assert.rejects(loadDataset(directory));
    await Promise.all(editions.map((edition) => writeFile(join(directory, `${edition}.mmdb`), "invalid")));
    await assert.rejects(loadDataset(directory));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
