import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseUpdateState, updatePolicy, updateStatus, type UpdateState } from "../../src/server/geoip/update-state.ts";
import { createManagedDatasetProvider, readUpdateState } from "../../src/server/geoip/managed.ts";
import { createLookupService } from "../../src/server/geoip/service.ts";
import { editions } from "../../src/server/geoip/dataset.ts";
import { runUpdate, validateCandidate, writeState } from "../../scripts/geoip/updater.ts";
import type { QueryableDataset } from "../../src/server/geoip/normalize.ts";
import type { CityResponse } from "maxmind";
import { validateUpdateConfiguration } from "../../scripts/geoip/configuration.ts";
const a = "a".repeat(64), b = "b".repeat(64);
const start = Date.UTC(2026,10,13);
const state = (id = a, time = start): UpdateState => ({ schema:1, active:id, lastAttemptAt:new Date(time).toISOString(), lastSuccessAt:new Date(time).toISOString(), outcome:"updated" });
const snapshot = (id=a, buildTime="2026-11-01T00:00:00Z"): QueryableDataset => {
  const reader = (edition: string) => ({ buildTime, reader: { get: () => edition === "asn"
    ? { autonomous_system_number:15169, autonomous_system_organization:"Fixture" }
    : { country: { iso_code:id===a?"US":"SG", geoname_id:1, names:{en:"Fixture"} } } } });
  return { id, readers: { "GeoLite2-City":reader("city"), "GeoLite2-Country":reader("country"), "GeoLite2-ASN":reader("asn") } };
};
const withRoot = async (fn:(root:string)=>Promise<void>) => { const root=await mkdtemp(join(tmpdir(),"ipinfo-update-test-"));try {await fn(root);}finally{await rm(root,{recursive:true,force:true});} };

test("update state rejects traversal, invalid dates and reversed timestamps",()=>{
  for(const patch of [{active:"../bad"},{active:[a]},{folder:"../bad"},{folder:b},{schema:2},{lastSuccessAt:"not-date"},{lastAttemptAt:"2000-01-01"},{outcome:"unknown"}]) assert.throws(()=>parseUpdateState({...state(),...patch}));
  assert.equal(parseUpdateState(state()).active,a);
});
test("72-hour warning and 30-day suspension use last successful confirmation, not build date",()=>{
  const time=state().lastSuccessAt;
  assert.equal(updateStatus(time,start+updatePolicy.warningMs-1).state,"current");
  assert.equal(updateStatus(time,start+updatePolicy.warningMs).state,"warning");
  assert.equal(updateStatus(time,start+updatePolicy.expiredMs-1).state,"warning");
  assert.equal(updateStatus(time,start+updatePolicy.expiredMs).state,"expired");
  assert.equal(updateStatus(new Date(start+120_000).toISOString(),start).state,"unavailable");
});
test("managed provider switches full snapshots, invalidates facts cache, preserves captured readers",async()=>{
  let published=state(), loads=0;
  const provider=createManagedDatasetProvider({directory:()=>"fixture",read:async()=>published,load:async path=>{loads++;return snapshot(path.endsWith(b)?b:a);},now:()=>start});
  const service=createLookupService({getDataset:provider.get});
  const [old,first]=await Promise.all([provider.get(),service.lookup("8.8.8.8")]);assert.equal(loads,1);assert.equal(first.geolocatedCountry?.code,"US");
  published=state(b);const next=await service.lookup("8.8.8.8");assert.equal(next.datasetId,b);assert.equal(next.geolocatedCountry?.code,"SG");
  assert.equal(old.id,a);assert.equal((old.readers["GeoLite2-City"].reader.get("8.8.8.8") as CityResponse)?.country?.iso_code,"US");assert.equal(loads,2);
});
test("failed reload keeps only previously verified data; 30 days blocks it and recovery reopens",async()=>{
  let published=state(), time=start, fail=false;
  const provider=createManagedDatasetProvider({directory:()=>"fixture",read:async()=>published,load:async path=>{if(fail)throw Error("private failure");return snapshot(path.endsWith(b)?b:a);},now:()=>time});
  await provider.get();fail=true;published=state(b,start+1_000);time=start+updatePolicy.warningMs;
  assert.equal((await provider.get()).id,a);assert.equal((await provider.status()).state,"warning");
  time=start+updatePolicy.expiredMs;await assert.rejects(provider.get(),{code:"DATA_UNAVAILABLE"});
  time+=5_000;fail=false;published=state(b,time);assert.equal((await provider.get()).id,b);assert.equal((await provider.status()).state,"current");
});
test("state read failure cannot refresh validity; restarting with expired state also refuses data",async()=>{
  let time=start, unreadable=false;
  const provider=createManagedDatasetProvider({directory:()=>"fixture",read:async()=>{if(unreadable)throw Error("disk");return state();},load:async()=>snapshot(),now:()=>time});
  await provider.get();unreadable=true;assert.equal((await provider.status()).state,"warning");
  time+=updatePolicy.expiredMs;await assert.rejects(provider.get());
  const restarted=createManagedDatasetProvider({directory:()=>"fixture",read:async()=>state(),load:async()=>snapshot(),now:()=>time});await assert.rejects(restarted.get());
});
test("publication race during initial load re-reads pointer rather than returning retired data",async()=>{
  let published=state();const provider=createManagedDatasetProvider({directory:()=>"fixture",read:async()=>published,load:async path=>{if(path.endsWith(a)){published=state(b);return snapshot();}return snapshot(b);},now:()=>start});
  assert.equal((await provider.get()).id,b);
});
test("candidate validation rejects missing and corrupt files before publication",()=>withRoot(async root=>{
  await assert.rejects(validateCandidate(root,start));for(const e of editions)await writeFile(join(root,e+".mmdb"),"broken");await assert.rejects(validateCandidate(root,start));
}));
test("unchanged check seeds all existing files, avoids switching, confirms validity and cleans staging",()=>withRoot(async root=>{
  await mkdir(join(root,"releases",a),{recursive:true});for(const e of editions)await writeFile(join(root,"releases",a,e+".mmdb"),e);
  await writeState(root,state());
  const result=await runUpdate({root,download:async stage=>{for(const e of editions)assert.equal(await readFile(join(stage,e+".mmdb"),"utf8"),e);},validate:async()=>snapshot(),loadExisting:async()=>snapshot(),now:()=>start+1_000});
  assert.equal(result.changed,false);const s=await readUpdateState(root);assert.equal(s.outcome,"unchanged");assert.equal(s.lastSuccessAt,new Date(start+1_000).toISOString());assert.deepEqual((await readdir(root)).sort(),["releases","state.json"]);
}));
test("failed download/partial validation preserves active state and cannot extend confirmation",()=>withRoot(async root=>{
  await writeState(root,state());
  for(const download of [async()=>{throw Error("secret from vendor");},async()=>{}]) {
    await assert.rejects(runUpdate({root,download,validate:async()=>{throw Error("partial candidate");},now:()=>start+1_000}),/^Error: UPDATE_FAILED$/);
    const s=await readUpdateState(root);assert.equal(s.active,a);assert.equal(s.lastSuccessAt,state().lastSuccessAt);assert.equal(s.outcome,"failed");
  }
}));
test("successful three-library publication atomically selects new ID and retires old files",()=>withRoot(async root=>{
  await mkdir(join(root,"releases",a),{recursive:true});await writeState(root,state());
  await runUpdate({root,download:async stage=>{await writeFile(join(stage,"validated-fixture"),"ok");},validate:async()=>snapshot(b),loadExisting:async()=>snapshot(),now:()=>start+1_000});
  assert.equal((await readUpdateState(root)).active,b);assert.deepEqual(await readdir(join(root,"releases")),[b]);assert.equal(await readFile(join(root,"releases",b,"validated-fixture"),"utf8"),"ok");
}));
test("older per-edition build is rejected even if the complete dataset identity changes",()=>withRoot(async root=>{
  await writeState(root,state());await assert.rejects(runUpdate({root,download:async()=>{},validate:async()=>snapshot(b,"2026-10-01T00:00:00Z"),loadExisting:async()=>snapshot(),now:()=>start+1_000}));assert.equal((await readUpdateState(root)).active,a);
}));
test("valid same-content download repairs a corrupt active directory instead of confirming broken files",()=>withRoot(async root=>{
  await mkdir(join(root,"releases",a),{recursive:true});await writeFile(join(root,"releases",a,"GeoLite2-City.mmdb"),"corrupt");await writeState(root,state());
  await runUpdate({root,download:async stage=>{await writeFile(join(stage,"GeoLite2-City.mmdb"),"repaired");},validate:async()=>snapshot(),loadExisting:async()=>{throw Error("corrupt active data");},now:()=>start+1_000});
  const active=await readUpdateState(root);
  const directories=await readdir(join(root,"releases"));
  assert.equal(directories.length,1);
  assert.equal(active.active,a);
  assert.equal(await readFile(join(root,"releases",directories[0],"GeoLite2-City.mmdb"),"utf8"),"repaired");
}));
test("only all three official editions and complete credentials can confirm a database update",()=>{
  const base="AccountID 123\nLicenseKey unit-fixture\nEditionIDs GeoLite2-City GeoLite2-Country GeoLite2-ASN\n";
  assert.doesNotThrow(()=>validateUpdateConfiguration(base));
  for(const value of [base.replace(" GeoLite2-City",""),base.replace("GeoLite2-ASN","GeoLite2-Country"),base+"Host example.com\n",base+"Proxy localhost\n",base+"AccountID 456\n",base.replace("LicenseKey unit-fixture\n","")]) assert.throws(()=>validateUpdateConfiguration(value));
});
