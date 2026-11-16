import { normalizeProviderDomain } from "../lib/provider-domain.ts";

export type ProviderIcon = { bytes: Uint8Array; type: "image/png" | "image/x-icon" };
const MAX_BYTES = 65_536;
function imageType(bytes: Uint8Array): ProviderIcon["type"] | null {
  if (bytes.length >= 24 && Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    const b = Buffer.from(bytes); return b.readUInt32BE(16) > 0 && b.readUInt32BE(16) <= 256 && b.readUInt32BE(20) > 0 && b.readUInt32BE(20) <= 256 ? "image/png" : null;
  }
  if (bytes.length >= 22 && bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 1 && bytes[3] === 0) {
    const b = Buffer.from(bytes), count = b.readUInt16LE(4);
    if (!count || count > 16 || 6 + count * 16 > bytes.length) return null;
    for (let i = 0; i < count; i++) {
      const start = 6 + i * 16, size = b.readUInt32LE(start + 8), offset = b.readUInt32LE(start + 12);
      if (!size || offset < 6 + count * 16 || offset + size > bytes.length) return null;
    }
    return "image/x-icon";
  }
  return null;
}

/** Only a fixed favicon service is contacted; no caller headers, redirects or arbitrary hosts. */
export function createProviderIconSource({ transport = fetch, now = Date.now, timeoutMs = 3_000 }: { transport?: typeof fetch; now?: () => number; timeoutMs?: number } = {}) {
  const cache = new Map<string, { icon: ProviderIcon | null; expires: number }>();
  const pending = new Map<string, Promise<ProviderIcon | null>>();
  async function download(domain: string): Promise<ProviderIcon | null> {
    const abort = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined;
    const operation = async () => {
      const response = await transport(`https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`, {
        redirect: "error", credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store", signal: abort.signal,
        headers: { Accept: "image/x-icon,image/png" },
      });
      if (!response.ok || !response.body || Number(response.headers.get("Content-Length")) > MAX_BYTES
        || !["image/png", "image/x-icon", "image/vnd.microsoft.icon"].includes(response.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() ?? "")) return null;
      const reader = response.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
      try {
        for (;;) {
          const item = await reader.read(); if (item.done) break;
          size += item.value.byteLength; if (size > MAX_BYTES) return null;
          chunks.push(item.value);
        }
      } finally { await reader.cancel().catch(() => {}); }
      const bytes = Buffer.concat(chunks), type = imageType(bytes);
      return type ? { bytes: new Uint8Array(bytes), type } : null;
    };
    try {
      return await Promise.race([operation(), new Promise<null>(resolve => { timer = setTimeout(() => { abort.abort(); resolve(null); }, timeoutMs); })]);
    } catch { return null; }
    finally { clearTimeout(timer); abort.abort(); }
  }
  return async (input: string): Promise<ProviderIcon | null> => {
    const domain = normalizeProviderDomain(input); if (!domain) return null;
    const cached = cache.get(domain); if (cached && cached.expires > now()) return cached.icon;
    if (pending.has(domain)) return pending.get(domain)!;
    if (pending.size >= 4) return null;
    const operation = download(domain).then(icon => {
      if (cache.size >= 128) cache.delete(cache.keys().next().value!);
      cache.set(domain, { icon, expires: now() + (icon ? 86_400_000 : 300_000) }); return icon;
    }).finally(() => pending.delete(domain));
    pending.set(domain, operation); return operation;
  };
}
