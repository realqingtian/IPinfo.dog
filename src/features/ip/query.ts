import { parseIp } from "../../lib/ip.ts";
import type { IpErrorCode, IpInformation } from "../../lib/contracts/ip.ts";
export type Selection = { key: string; input: string; target: string | null; error: IpErrorCode | null };
export function readQuery(search: string): Selection {
  const params = new URLSearchParams(search), values = params.getAll("ip");
  const base = { key: params.toString(), input: values.join(","), target: null, error: null };
  if (!params.size) return base;
  if (values.length !== 1 || [...params.keys()].some((key) => key !== "ip")) return { ...base, error: "INVALID_IP" };
  try { const parsed = parseIp(base.input); return parsed.isPublic ? { ...base, target: parsed.address } : { ...base, error: "NON_PUBLIC_IP" }; }
  catch { return { ...base, error: "INVALID_IP" }; }
}
export function queryPath(input: string) {
  let address = input.trim();
  try { address = parseIp(address).address; } catch { /* Reload invalid targets as errors too. */ }
  return `/ip?${new URLSearchParams({ ip: address })}`;
}
export type LookupOutcome = { ok: true; data: IpInformation } | { ok: false; code: IpErrorCode; retryable: boolean; retryAfter?: number };
export type QueryState = { draft: string; target: string | null; phase: "idle" | "loading" | "success" | "error";
  result: IpInformation | null; error: IpErrorCode | null; retryable: boolean; retryAfter?: number };
/** Abort plus generation guard also handles transports that ignore cancellation. */
export function createQueryController({ initial, lookup, onSuccess }: {
  initial: Selection; lookup: (address: string, signal: AbortSignal) => Promise<LookupOutcome>; onSuccess: (result: IpInformation) => void;
}) {
  const initialState: QueryState = { draft: initial.input, target: initial.target, phase: initial.error ? "error" : initial.target ? "loading" : "idle", result: null, error: initial.error, retryable: false };
  let state = initialState, key: string | undefined, generation = 0, abort: AbortController | undefined;
  const listeners = new Set<() => void>();
  const publish = (next: QueryState) => { state = next; listeners.forEach((listener) => listener()); };
  return {
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => state, getServerSnapshot: () => initialState,
    setDraft: (draft: string) => publish({ ...state, draft }),
    navigate(selection: Selection, force = false, recordSuccess = false) {
      if (!force && selection.key === key) return;
      key = selection.key; const current = ++generation;
      abort?.abort(); abort = new AbortController();
      publish({ draft: selection.input, target: selection.target, phase: selection.error ? "error" : selection.target ? "loading" : "idle", result: null, error: selection.error, retryable: false });
      if (!selection.target || selection.error) return;
      const target = selection.target;
      void lookup(target, abort.signal).catch((): LookupOutcome => ({ ok: false, code: "DATA_UNAVAILABLE", retryable: true })).then((outcome) => {
        if (current !== generation) return;
        if (outcome.ok) { publish({ ...state, target, phase: "success", result: outcome.data, error: null, retryable: false }); if (recordSuccess) onSuccess(outcome.data); }
        else publish({ ...state, target, phase: "error", result: null, error: outcome.code, retryable: outcome.retryable, retryAfter: outcome.retryAfter });
      });
    },
    dispose() { ++generation; abort?.abort(); key = undefined; },
  };
}
