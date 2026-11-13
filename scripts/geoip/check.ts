import assert from "node:assert/strict";
import { mkdtemp, rm, copyFile, readFile, writeFile, readdir, access } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { editions } from "../../src/server/geoip/dataset.ts";
import { createManagedDatasetProvider, readUpdateState } from "../../src/server/geoip/managed.ts";
import { createLookupService } from "../../src/server/geoip/service.ts";
import { runUpdate, validateCandidate, writeState } from "./updater.ts";
import { updatePolicy } from "../../src/server/geoip/update-state.ts";

const source = process.env.GEOIP_DATABASE_DIR;
if (!source) throw Error("REAL_DATABASE_DIRECTORY_REQUIRED");
const root = await mkdtemp(join(tmpdir(), "ipinfo-real-update-"));
let clock = Date.now();
try {
  const original = await validateCandidate(source, clock);
  const first = await runUpdate({ root, download: async stage => {
    for (const edition of editions) await copyFile(join(source, edition+".mmdb"), join(stage, edition+".mmdb"));
  }, now: () => clock });
  assert.equal(first.datasetId, original.id);
  const provider = createManagedDatasetProvider({directory:()=>root,now:()=>clock});
  const service = createLookupService({getDataset:provider.get});
  const captured = await provider.get();
  assert.equal((await service.lookup("8.8.8.8")).datasetId, original.id);
  const next = await runUpdate({root,now:()=>clock,download:async stage=>{
    // TEST ONLY: advance metadata's build_epoch by one second in copied ASN.
    // No real source file is edited, and synthetic data never leaves this temp root.
    const path=join(stage,"GeoLite2-ASN.mmdb"),bytes=await readFile(path);
    const field=bytes.lastIndexOf(Buffer.from("build_epoch"));assert.ok(field>0);
    const control=bytes[field+"build_epoch".length];assert.equal(control>>5,0);
    assert.equal(bytes[field+"build_epoch".length+1]+7,9); // extended uint64
    const size=control&31;assert.ok(size>0&&size<=8);
    const offset=field+"build_epoch".length+2;
    const epoch=bytes.readUIntBE(offset,size);bytes.writeUIntBE(epoch+1,offset,size);await writeFile(path,bytes);
  }});
  assert.notEqual(next.datasetId, original.id);
  const concurrent=await Promise.all(Array.from({length:12},()=>service.lookup("8.8.8.8")));
  assert.ok(concurrent.every(r=>r.datasetId===next.datasetId));
  assert.ok(captured.readers["GeoLite2-ASN"].reader.get("8.8.8.8"));
  await assert.rejects(access(join(root,"releases",original.id)));
  const unchanged=await runUpdate({root,now:()=>clock,download:async()=>{}});assert.equal(unchanged.changed,false);
  const before=await readUpdateState(root);
  await assert.rejects(runUpdate({root,download:async stage=>{await writeFile(join(stage,"GeoLite2-City.mmdb"),"broken");},now:()=>clock}));
  assert.equal((await readUpdateState(root)).active,before.active);
  clock+=updatePolicy.warningMs;assert.equal((await provider.status()).state,"warning");assert.ok(await provider.get());
  clock=Date.parse(before.lastSuccessAt)+updatePolicy.expiredMs;await assert.rejects(provider.get());
  const restarted=createManagedDatasetProvider({directory:()=>root,now:()=>clock});await assert.rejects(restarted.get());
  await writeState(root,{...before,lastAttemptAt:new Date(clock).toISOString(),lastSuccessAt:new Date(clock).toISOString(),outcome:"unchanged"});
  assert.equal((await provider.status()).state,"current");assert.equal((await service.lookup("2001:4860:4860::8888")).datasetId,next.datasetId);
  assert.deepEqual(await readdir(join(root,"releases")),[next.datasetId]);
  console.log(JSON.stringify({passed:true,runtime:process.version,realEditions:3,sampleQueries:6,concurrentQueries:12,changedPublication:true,unchangedNoSwitch:true,failedCandidatePreservesActive:true,warningAndExpiry:true,restartExpiry:true,recovery:true,retiredFilesRemoved:true,capturedReaderSurvivesCleanup:true},null,2));
} finally {await rm(root,{recursive:true,force:true});}
