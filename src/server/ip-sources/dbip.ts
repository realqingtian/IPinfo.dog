import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { Reader, type AsnResponse, type CityResponse } from "maxmind";
import type { LocalizedName } from "../../lib/contracts/ip.ts";
import type { SourceRecord } from "../../lib/contracts/ip-sources.ts";
import { parseIp } from "../../lib/ip.ts";
import { SourceError } from "./error.ts";

export type DbipDataset = { generation: string; city: Reader<CityResponse>; asn: Reader<AsnResponse> };
export const dbipGeneration = /^[a-f0-9]{64}-[a-f0-9]{12}$/;
export function dbipNames(value?: object): LocalizedName {
  const result: LocalizedName = {};
  for (const locale of ["en", "zh-CN", "zh-TW"] as const) {
    const item = value && (value as Record<string, unknown>)[locale];
    if (typeof item === "string" && item.trim() && item.length <= 256) result[locale] = item;
  }
  return result;
}
export function normalizeDbip(dataset: DbipDataset, address: string, queriedAt: string): SourceRecord {
  const city = dataset.city.get(address), as = dataset.asn.get(address);
  if (!city && !as) throw new SourceError("NO_RECORD");
  const code = city?.country?.iso_code && /^[A-Z]{2}$/.test(city.country.iso_code) ? city.country.iso_code : null;
  const countryNames = dbipNames(city?.country?.names), cityNames = dbipNames(city?.city?.names);
  const rawAsn = as?.autonomous_system_number;
  return { address, source: "dbip", country: code || Object.keys(countryNames).length ? { code, names: countryNames } : null,
    city: Object.keys(cityNames).length ? cityNames : null,
    asn: Number.isInteger(rawAsn) && rawAsn! > 0 && rawAsn! <= 4_294_967_295 ? rawAsn! : null,
    organization: typeof as?.autonomous_system_organization === "string" && as.autonomous_system_organization.trim() ? as.autonomous_system_organization : null,
    domain: null, queriedAt, dataDates: [
      { kind: "city", date: dataset.city.metadata.buildEpoch.toISOString() },
      { kind: "asn", date: dataset.asn.metadata.buildEpoch.toISOString() },
    ] };
}
export async function loadDbipDataset(directory: string, generation: string, now = Date.now()): Promise<DbipDataset> {
  if (!dbipGeneration.test(generation)) throw new SourceError("UNAVAILABLE");
  const hashes: string[] = [];
  const load = async <T extends CityResponse | AsnResponse>(kind: "city" | "asn") => {
    const file = join(directory, "releases", generation, `${kind}.mmdb`);
    if ((await stat(file)).size > 256 * 1024 * 1024) throw new SourceError("UNAVAILABLE");
    const bytes = await readFile(file);
    hashes.push(createHash("sha256").update(bytes).digest("hex"));
    const reader = new Reader<T>(bytes);
    const expected = kind === "city" ? "DBIP-City-Lite" : "DBIP-ASN-Lite (compat=GeoLite2-ASN)";
    const age = now - reader.metadata.buildEpoch.getTime();
    if (reader.metadata.databaseType !== expected || reader.metadata.ipVersion !== 6 || !Number.isFinite(age) || age < -86_400_000 || age > 100 * 86_400_000) throw new SourceError("UNAVAILABLE");
    return reader;
  };
  const dataset = { generation, city: await load<CityResponse>("city"), asn: await load<AsnResponse>("asn") };
  if (createHash("sha256").update(hashes.join(":")).digest("hex") !== generation.slice(0, 64)) throw new SourceError("UNAVAILABLE");
  return dataset;
}
export function createDbipSource({ directory, now = Date.now, load = loadDbipDataset, checkMs = 60_000 }: {
  directory: () => string | undefined; now?: () => number; load?: typeof loadDbipDataset; checkMs?: number;
}) {
  let active: DbipDataset | undefined, pending: Promise<void> | undefined, nextCheck = 0;
  return async (input: string): Promise<SourceRecord> => {
    const parsed = parseIp(input); if (!parsed.isPublic) throw new SourceError("UNAVAILABLE");
    const dir = directory(); if (!dir) throw new SourceError("NOT_CONFIGURED");
    if (now() >= nextCheck) {
      pending ??= (async () => {
        try {
          const file = join(dir, "state.json");
          if ((await stat(file)).size > 4096) throw new SourceError("UNAVAILABLE");
          const state = JSON.parse(await readFile(file, "utf8"));
          if (typeof state.generation !== "string" || !dbipGeneration.test(state.generation)) throw new SourceError("UNAVAILABLE");
          if (state.generation !== active?.generation) active = await load(dir, state.generation, now());
        } finally { nextCheck = now() + checkMs; }
      })().finally(() => { pending = undefined; });
      await pending.catch(() => { /* Keep a previously validated generation, within its age limit. */ });
    } else if (pending) await pending.catch(() => {});
    if (!active || [active.city, active.asn].some(reader => now() - reader.metadata.buildEpoch.getTime() > 100 * 86_400_000)) throw new SourceError("UNAVAILABLE");
    return normalizeDbip(active, parsed.address, new Date(now()).toISOString());
  };
}
