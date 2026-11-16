import { parseIp } from "../../lib/ip.ts";
import type { SourceRecord } from "../../lib/contracts/ip-sources.ts";
import { SourceError } from "./error.ts";

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown, limit = 256) => typeof v === "string" && v.trim() && v.length <= limit && !/[\u0000-\u001f\u007f]/u.test(v) ? v.trim() : null;
export function normalizeIpinfo(body: unknown, address: string, queriedAt: string): SourceRecord {
  if (!object(body) || typeof body.ip !== "string" || parseIp(body.ip).address !== address) throw new SourceError("UNAVAILABLE");
  if (body.bogon === true) throw new SourceError("NO_RECORD");
  const code = typeof body.country_code === "string" && /^[A-Z]{2}$/.test(body.country_code) ? body.country_code : null;
  const name = text(body.country), organization = text(body.as_name);
  const rawAsn = typeof body.asn === "string" && /^AS[1-9]\d{0,9}$/.test(body.asn) ? Number(body.asn.slice(2)) : null;
  const asn = rawAsn && rawAsn <= 4_294_967_295 ? rawAsn : null;
  if (!code && !name && !asn && !organization) throw new SourceError("NO_RECORD");
  return { address, source: "ipinfo", country: code || name ? { code, names: name ? { en: name } : {} } : null,
    city: null, asn, organization, domain: text(body.as_domain), queriedAt, dataDates: [] };
}

/** Fixed HTTPS authority; no redirect, query-string credential or raw upstream error escapes. */
export function createIpinfoSource({ getToken, transport = fetch, now = Date.now, timeoutMs = 5_000 }: {
  getToken: () => Promise<string | undefined>; transport?: typeof fetch; now?: () => number; timeoutMs?: number;
}) {
  return async (address: string): Promise<SourceRecord> => {
    const parsed = parseIp(address);
    if (!parsed.isPublic) throw new SourceError("UNAVAILABLE");
    const token = (await getToken())?.trim();
    if (!token || /\s/.test(token)) throw new SourceError("NOT_CONFIGURED");
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const operation = async () => {
      const response = await transport(`https://api.ipinfo.io/lite/${encodeURIComponent(parsed.address)}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        redirect: "error", cache: "no-store", signal: abort.signal,
      });
      if (response.status === 429) throw new SourceError("RATE_LIMITED");
      if (!response.ok) throw new SourceError("UNAVAILABLE");
      if (!response.body || Number(response.headers.get("Content-Length")) > 65_536) throw new SourceError("UNAVAILABLE");
      const reader = response.body.getReader(); let size = 0;
      const chunks: Uint8Array[] = [];
      try {
        for (;;) {
          const item = await reader.read(); if (item.done) break;
          size += item.value.byteLength;
          if (size > 65_536) throw new SourceError("UNAVAILABLE");
          chunks.push(item.value);
        }
      } finally { await reader.cancel().catch(() => {}); }
      const bytes = Buffer.concat(chunks);
      return normalizeIpinfo(JSON.parse(bytes.toString("utf8")), parsed.address, new Date(now()).toISOString());
    };
    try {
      return await Promise.race([operation(), new Promise<never>((_, reject) => {
        timer = setTimeout(() => { abort.abort(); reject(new SourceError("TIMEOUT")); }, timeoutMs);
      })]);
    } catch (error) { if (error instanceof SourceError) throw error; throw new SourceError("UNAVAILABLE"); }
    finally { clearTimeout(timer); abort.abort(); }
  };
}
