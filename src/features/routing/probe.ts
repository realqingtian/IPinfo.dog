import { parseIp, type ParsedIp } from "../../lib/ip.ts";
import type { RoutingTarget } from "./catalog.ts";

export const routingPolicy = { concurrency: 4, timeoutMs: 6_000, maxBytes: 65_536 } as const;
export type RoutingError = "TIMEOUT" | "CANCELLED" | "REQUEST_FAILED" | "HTTP_ERROR" | "NO_IP" | "INVALID_DATA" | "TOO_LARGE";
export type RoutingMeasurement = Pick<ParsedIp, "address" | "family"> & { elapsedMs: number; checkedAt: string };
export type RoutingOutcome = { ok: true; measurement: RoutingMeasurement } | { ok: false; code: RoutingError; status?: number };

function publicAddress(value: string) {
  try { const parsed = parseIp(value); if (parsed.isPublic) return { address: parsed.address, family: parsed.family }; } catch { /* Never guess an address from unrelated text. */ }
  return null;
}
export function traceAddress(text: string): RoutingOutcome | Pick<ParsedIp, "address" | "family"> {
  const values = text.split(/\r?\n/).filter(line => line.startsWith("ip=")).map(line => line.slice(3).trim());
  if (!values.length) return { ok: false, code: "NO_IP" };
  if (values.length !== 1) return { ok: false, code: "INVALID_DATA" };
  return publicAddress(values[0]) ?? { ok: false, code: "INVALID_DATA" };
}
async function limitedText(response: Response) {
  if (Number(response.headers.get("Content-Length")) > routingPolicy.maxBytes) throw new Error("TOO_LARGE");
  if (!response.body) return "";
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let size = 0, text = "";
  try {
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > routingPolicy.maxBytes) { void reader.cancel().catch(() => {}); throw new Error("TOO_LARGE"); }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return text + decoder.decode();
  } finally { reader.releaseLock(); }
}

export async function probeRoutingTarget(target: RoutingTarget, signal: AbortSignal, {
  transport = fetch, timeoutMs = routingPolicy.timeoutMs, clock = () => performance.now(), now = Date.now, nonce = () => crypto.randomUUID(),
}: { transport?: typeof fetch; timeoutMs?: number; clock?: () => number; now?: () => number; nonce?: () => string } = {}): Promise<RoutingOutcome> {
  if (signal.aborted) return { ok: false, code: "CANCELLED" };
  const abort = new AbortController(), start = clock();
  let timer: ReturnType<typeof setTimeout> | undefined, cancel!: () => void;
  const interruption = new Promise<RoutingOutcome>(resolve => {
    cancel = () => { abort.abort(); resolve({ ok: false, code: "CANCELLED" }); };
    signal.addEventListener("abort", cancel, { once: true });
    timer = setTimeout(() => { abort.abort(); resolve({ ok: false, code: "TIMEOUT" }); }, timeoutMs);
  });
  try {
    const operation = (async (): Promise<RoutingOutcome> => {
      const url = new URL(target.url); url.searchParams.set("ipinfo_probe", nonce());
      const response = await transport(url.href, { method: target.method === "header" ? "HEAD" : "GET", signal: abort.signal, credentials: "omit", mode: "cors", referrerPolicy: "no-referrer", cache: "no-store", redirect: "error" });
      if (!response.ok) { void response.body?.cancel().catch(() => {}); return { ok: false, code: "HTTP_ERROR", status: response.status }; }
      if (response.type === "opaque") return { ok: false, code: "REQUEST_FAILED" };
      let address: Pick<ParsedIp, "address" | "family"> | null = null;
      if (target.method === "header") {
        for (const key of target.headers ?? []) {
          const value = response.headers.get(key);
          if (value && value.length <= 256) { address = publicAddress(value); if (address) break; }
        }
        if (!address) return { ok: false, code: "NO_IP" };
      } else {
        const type = response.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase();
        if (type && type !== "text/plain") { void response.body?.cancel().catch(() => {}); return { ok: false, code: "INVALID_DATA" }; }
        const result = traceAddress(await limitedText(response));
        if ("ok" in result) return result;
        address = result;
      }
      return { ok: true, measurement: { ...address, elapsedMs: Math.max(0, Math.round(clock() - start)), checkedAt: new Date(now()).toISOString() } };
    })().catch((error): RoutingOutcome => ({ ok: false, code: error instanceof Error && error.message === "TOO_LARGE" ? "TOO_LARGE" : "REQUEST_FAILED" }));
    return await Promise.race([operation, interruption]);
  } finally { clearTimeout(timer); signal.removeEventListener("abort", cancel); }
}
