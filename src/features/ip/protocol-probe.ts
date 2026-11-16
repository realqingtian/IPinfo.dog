import { apiUrl } from "../../lib/api-url.ts";
import { parseIp } from "../../lib/ip.ts";
import { fetchExit, type Family, type ProbeOutcome } from "./exit.ts";

export const protocolEchoUrls = Object.freeze({ ipv4: "https://api.ipify.org?format=json", ipv6: "https://api6.ipify.org?format=json" });

/** Fixed browser-side family-specific echo, never a server-side self-IP request. */
export async function fetchProtocolEcho(family: Family, signal: AbortSignal, transport: typeof fetch = fetch, timeoutMs = 5_000): Promise<ProbeOutcome> {
  const fail = { ok: false, code: "DETECTION_FAILED" } as const;
  if (signal.aborted) return fail;
  const abort = new AbortController(), cancel = () => abort.abort();
  signal.addEventListener("abort", cancel, { once: true });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const operation = async (): Promise<ProbeOutcome> => {
    const response = await transport(protocolEchoUrls[family], { signal: abort.signal, redirect: "error", mode: "cors", credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store" });
    if (response.status === 429) return { ok: false, code: "RATE_LIMITED" };
    if (!response.ok || !response.body || Number(response.headers.get("Content-Length")) > 4096) return fail;
    const reader = response.body.getReader(), chunks: Uint8Array[] = []; let length = 0;
    try {
      for (;;) { const item = await reader.read(); if (item.done) break; length += item.value.byteLength; if (length > 4096) return fail; chunks.push(item.value); }
    } finally { await reader.cancel().catch(() => {}); }
    const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const body: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!body || typeof body !== "object" || !("ip" in body) || typeof body.ip !== "string") return fail;
    const parsed = parseIp(body.ip);
    return parsed.isPublic && parsed.family === family ? { ok: true, data: { address: parsed.address, family, detectedAt: new Date().toISOString() } } : fail;
  };
  try {
    return await Promise.race([operation(), new Promise<ProbeOutcome>(resolve => { timer = setTimeout(() => { abort.abort(); resolve({ ok: false, code: "TIMEOUT" }); }, timeoutMs); })]);
  } catch { return fail; }
  finally { clearTimeout(timer); abort.abort(); signal.removeEventListener("abort", cancel); }
}

export async function fetchProtocolExit(family: Family, signal: AbortSignal, transport: typeof fetch = fetch): Promise<ProbeOutcome> {
  if (signal.aborted) return { ok: false, code: "DETECTION_FAILED" };
  const current = await fetchExit(apiUrl("/api/connection"), "any", signal, transport);
  if (current.ok && current.data.family === family) return current;
  return fetchProtocolEcho(family, signal, transport);
}
