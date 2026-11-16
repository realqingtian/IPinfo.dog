import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
const hosts = new Set(["ipinfo.io", "dl.assets.ipinfo.io", "dl.ipinfo.io", "storage.googleapis.com"]);
export async function officialResponse(path: string, token: string, signal: AbortSignal, transport: typeof fetch = fetch) {
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(token) || !["ipinfo_lite.mmdb", "ipinfo_lite.mmdb/checksums"].includes(path)) throw Error("DOWNLOAD_FAILED");
  let url = new URL(`https://ipinfo.io/data/${path}`); url.searchParams.set("token", token);
  for (let redirects = 0; redirects <= 3; redirects++) {
    const response = await transport(url, { signal, redirect: "manual", credentials: "omit", referrerPolicy: "no-referrer", headers: { Accept: "application/octet-stream, application/json" } });
    if (![301, 302, 303, 307, 308].includes(response.status)) { if (!response.ok) throw Error("DOWNLOAD_FAILED"); return response; }
    const location = response.headers.get("Location"); await response.body?.cancel(); if (!location) throw Error("DOWNLOAD_FAILED");
    const next = new URL(location, url);
    if (next.protocol !== "https:" || next.username || next.password || next.port || next.hash || !hosts.has(next.hostname) || next.href.includes(token)) throw Error("UNTRUSTED_REDIRECT");
    url = next;
  }
  throw Error("DOWNLOAD_FAILED");
}
async function bounded(response: Response, limit: number) {
  if (!response.body || Number(response.headers.get("Content-Length")) > limit) throw Error("DOWNLOAD_TOO_LARGE");
  const reader = response.body.getReader(), parts: Uint8Array[] = []; let length = 0;
  try { for (;;) { const item = await reader.read(); if (item.done) break; length += item.value.byteLength; if (length > limit) throw Error("DOWNLOAD_TOO_LARGE"); parts.push(item.value); } }
  finally { await reader.cancel().catch(() => {}); }
  const bytes = Buffer.alloc(length); let offset = 0; for (const part of parts) { bytes.set(part, offset); offset += part.length; } return bytes;
}
export async function downloadIpinfo(stage: string, token: string, transport: typeof fetch = fetch) {
  const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 120_000), path = join(stage, "ipinfo_lite.mmdb");
  try {
    const checksum = JSON.parse((await bounded(await officialResponse("ipinfo_lite.mmdb/checksums", token, abort.signal, transport), 16384)).toString("utf8"))?.checksums?.sha256;
    if (typeof checksum !== "string" || !/^[a-f0-9]{64}$/.test(checksum)) throw Error("INVALID_CHECKSUM");
    try { if (createHash("sha256").update(await readFile(path)).digest("hex") === checksum) return; } catch { /* No valid seeded candidate. */ }
    const bytes = await bounded(await officialResponse("ipinfo_lite.mmdb", token, abort.signal, transport), 256 * 1024 * 1024);
    if (createHash("sha256").update(bytes).digest("hex") !== checksum) throw Error("CHECKSUM_MISMATCH");
    await writeFile(path, bytes, { mode: 0o644 });
  } finally { clearTimeout(timer); abort.abort(); }
}
