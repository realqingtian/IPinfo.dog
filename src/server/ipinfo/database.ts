import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { Reader } from "maxmind";
import { normalizeProviderDomain } from "../../lib/provider-domain.ts";
import { parseIp } from "../../lib/ip.ts";
import type { SourceRecord } from "../../lib/contracts/ip-sources.ts";
import { parseUpdateState, updateStatus } from "../geoip/update-state.ts";

const text = (value: unknown) => typeof value === "string" && value.trim() && value.trim() !== "-" && value.length <= 256 && !/[\u0000-\u001f\u007f]/u.test(value) ? value.trim() : null;
export function normalizeIpinfo(value: Record<string, unknown>, address: string, buildTime: string, queriedAt: string): SourceRecord | null {
  const country = typeof value.country_code === "string" && /^[A-Z]{2}$/.test(value.country_code) ? value.country_code : null;
  const number = typeof value.asn === "string" && /^AS[1-9]\d{0,9}$/.test(value.asn) ? Number(value.asn.slice(2)) : null;
  const asn = number && number <= 4_294_967_295 ? number : null, organization = text(value.as_name), name = text(value.country);
  if (!country && !asn && !organization) return null;
  return { address, source: "ipinfo", country: country ? { code: country, names: name ? { en: name } : {} } : null,
    city: null, asn, organization, domain: asn ? normalizeProviderDomain(value.as_domain) : null, queriedAt,
    dataDates: [{ kind: "country", date: buildTime }, { kind: "asn", date: buildTime }] };
}
export type IpinfoDataset = { id: string; buildTime: string; get: (address: string, queriedAt: string) => SourceRecord | null };
export async function loadIpinfo(directory: string, now = Date.now()): Promise<IpinfoDataset> {
  const path = join(directory, "ipinfo_lite.mmdb"), size = (await stat(path)).size;
  if (size < 1024 || size > 256 * 1024 * 1024) throw new Error("INVALID_DATABASE_SIZE");
  const bytes = await readFile(path), reader = new Reader<Record<string, unknown>>(bytes), metadata = reader.metadata;
  if (!/^ipinfo (?:bundle_location_lite|ipinfo_lite)\.mmdb$/.test(metadata.databaseType) || metadata.ipVersion !== 6) throw new Error("INVALID_DATABASE_TYPE");
  const buildTime = metadata.buildEpoch.toISOString(), time = Date.parse(buildTime);
  if (time < Date.UTC(2000, 0, 1) || time > now + 86_400_000) throw new Error("INVALID_DATABASE_TIME");
  const result = { id: createHash("sha256").update(bytes).digest("hex"), buildTime,
    get(address: string, queriedAt: string) { const value = reader.get(address); return value ? normalizeIpinfo(value, address, buildTime, queriedAt) : null; } };
  for (const address of ["8.8.8.8", "2001:4860:4860::8888"]) {
    const sample = result.get(address, new Date(now).toISOString());
    if (!sample?.country || sample.asn !== 15169 || !sample.organization || !sample.domain) throw new Error("SAMPLE_QUERY_FAILED");
  }
  return result;
}
export async function readIpinfoState(root: string) {
  const raw = await readFile(join(root, "state.json"), "utf8");
  if (raw.length > 4096) throw new Error("INVALID_UPDATE_STATE");
  return parseUpdateState(JSON.parse(raw));
}
export function createIpinfoProvider({ directory, load = loadIpinfo, read = readIpinfoState, now = Date.now }: {
  directory: () => string | undefined; load?: typeof loadIpinfo; read?: typeof readIpinfoState; now?: () => number;
}) {
  let active: IpinfoDataset | undefined, confirmed: string | null = null, pending: Promise<void> | undefined, retryAt = 0, refreshFailed = false;
  async function refresh() {
    const root = directory();
    if (!root) return;
    try {
      const state = await read(root);
      if (["unavailable", "expired"].includes(updateStatus(state.lastSuccessAt, now()).state)) throw Error("EXPIRED");
      if (state.active !== active?.id) {
        if (now() < retryAt) throw Error("RELOAD_BACKOFF");
        const folder = state.folder ?? state.active, next = await load(join(root, "releases", folder), now());
        const latest = await read(root);
        if (next.id !== state.active || latest.active !== state.active || (latest.folder ?? latest.active) !== folder) throw Error("PUBLICATION_CHANGED");
        active = next;
      }
      confirmed = state.lastSuccessAt; refreshFailed = false;
    } catch { retryAt = now() + 5000; refreshFailed = true; }
  }
  return { async lookup(input: string): Promise<SourceRecord | null> {
    const ip = parseIp(input); if (!ip.isPublic) throw Error("NON_PUBLIC_IP");
    if (!directory()) throw Error("NOT_CONFIGURED");
    pending ??= refresh().finally(() => { pending = undefined; }); await pending;
    const status = updateStatus(confirmed, now());
    if (!active || ["unavailable", "expired"].includes(status.state)) throw Error("DATA_UNAVAILABLE");
    const record = active.get(ip.address, new Date(now()).toISOString());
    return record ? { ...record, updateWarning: status.state === "warning" || refreshFailed } : null;
  } };
}
