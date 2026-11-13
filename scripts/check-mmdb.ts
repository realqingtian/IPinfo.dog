import assert from "node:assert/strict";
import { readFile, mkdtemp, rm, copyFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadDataset, editions, queryDataset } from "../src/server/geoip/dataset.ts";

const directory = process.env.GEOIP_DATABASE_DIR;
if (!directory) throw new Error("Set GEOIP_DATABASE_DIR to the three real MMDB files");
const referencePath = process.argv[2];
if (!referencePath) throw new Error("Supply an official Python reference JSON file");
const reference = JSON.parse(await readFile(referencePath, "utf8"));
assert.equal(reference.all_queries_verified, true);
const dataset = await loadDataset(directory);
let queries = 0;
for (const edition of editions) {
  const item = dataset.readers[edition];
  const original = reference.results.find((r: { edition: string }) => r.edition === edition);
  assert.equal(item.sha256, original.mmdb_sha256);
  const expected = reference.lookup_results.find((r: { edition: string }) => r.edition === edition);
  for (const query of expected.queries) {
    const record = queryDataset(dataset, edition, query.ip);
    assert.equal(record !== null, query.found);
    if (record && edition === "GeoLite2-ASN") {
      assert.ok("autonomous_system_number" in record);
      assert.equal(record.autonomous_system_number, query.asn);
      assert.equal(record.autonomous_system_organization, query.organization);
    } else if (record) {
      assert.ok("country" in record || "registered_country" in record);
      const geo = record as import("maxmind").CityResponse;
      assert.equal(geo.country?.iso_code, query.country_iso_code ?? undefined);
      assert.equal(geo.registered_country?.iso_code, query.registered_country_iso_code ?? undefined);
      if (edition === "GeoLite2-City") assert.equal(geo.city?.names?.en, query.city_name ?? undefined);
    }
    queries++;
  }
  assert.throws(() => queryDataset(dataset, edition, "not-an-ip"), /INVALID_IP/);
}

const candidate = await mkdtemp(join(tmpdir(), "ipinfo-candidate-"));
try {
  await Promise.all(editions.map((edition) => copyFile(join(directory, `${edition}.mmdb`), join(candidate, `${edition}.mmdb`))));
  const second = await loadDataset(candidate);
  assert.equal(dataset.id, second.id);
  await writeFile(join(candidate, "GeoLite2-City.mmdb"), "broken candidate");
  await assert.rejects(loadDataset(candidate));
  assert.ok(dataset.readers["GeoLite2-ASN"].reader.get("8.8.8.8"));
  await rm(candidate, { recursive: true, force: true });
  assert.ok(second.readers["GeoLite2-ASN"].reader.get("8.8.8.8"));
} finally {
  await rm(candidate, { recursive: true, force: true });
}
console.log(JSON.stringify({ runtime: process.version, passed: true, queries,
  invalidIpChecks: 3, databaseHashesMatched: 3, candidateFailurePreservesActive: true,
  readersSurviveSourceRemoval: true, datasetId: dataset.id }, null, 2));
