import { dnsResolvers, isDnsType, normalizeDnsName, type DnsSelection, type DnsType, type DnsResult, type ResolverId } from "./contracts.ts";

export function readDnsQuery(search: string): { selection: DnsSelection | null; invalid: boolean; draft: string; type: DnsType } {
  const p = new URLSearchParams(search), draft = p.get("name") ?? "", type = p.get("type") ?? "A";
  if (!p.size) return { selection: null, invalid: false, draft: "", type: "A" };
  try {
    if ([...p.keys()].some(k => k !== "name" && k !== "type") || p.getAll("name").length !== 1 || p.getAll("type").length > 1 || !isDnsType(type)) throw new Error();
    return { selection: { name: normalizeDnsName(draft), type }, invalid: false, draft, type };
  } catch { return { selection: null, invalid: true, draft, type: isDnsType(type) ? type : "A" }; }
}
export type DnsRow = { phase: "loading" | "done"; result?: DnsResult };
export type DnsState = { draft: string; type: DnsType; target: DnsSelection | null; invalid: boolean; rows: Partial<Record<ResolverId, DnsRow>> };
export function createDnsController(lookup: (selection: DnsSelection, resolver: ResolverId, signal: AbortSignal) => Promise<DnsResult>, initial = readDnsQuery("")) {
  const initialState: DnsState = { draft: initial.draft, type: initial.type, target: null, invalid: initial.invalid, rows: {} };
  let state = initialState, generation = 0, navigationKey: string | undefined;
  const active = new Map<ResolverId, AbortController>(), listeners = new Set<() => void>();
  const publish = (next: DnsState) => { state = next; listeners.forEach(fn => fn()); };
  function cancelRequests() { generation++; active.forEach(x => x.abort()); active.clear(); }
  function run(id: ResolverId) {
    const target = state.target; if (!target) return;
    active.get(id)?.abort(); const abort = new AbortController(), current = generation;
    active.set(id, abort); publish({ ...state, rows: { ...state.rows, [id]: { phase: "loading" } } });
    void lookup(target, id, abort.signal).catch((): DnsResult => ({ ...target, resolver: id, status: "unavailable", records: [], elapsedMs: 0 })).then(result => {
      if (current !== generation || active.get(id) !== abort) return;
      active.delete(id); publish({ ...state, rows: { ...state.rows, [id]: { phase: "done", result } } });
    });
  }
  return {
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    getSnapshot: () => state, getServerSnapshot: () => initialState,
    setDraft(draft: string) { publish({ ...state, draft }); },
    setType(type: DnsType) { publish({ ...state, type }); },
    navigate(search: string, force = false) {
      if (!force && search === navigationKey) return;
      navigationKey = search; cancelRequests(); const parsed = readDnsQuery(search);
      publish({ draft: parsed.draft, type: parsed.type, target: parsed.selection, invalid: parsed.invalid, rows: {} });
      if (parsed.selection) dnsResolvers.forEach(x => run(x.id));
    },
    retry: run,
    cancel() {
      cancelRequests();
      publish({ ...state, rows: Object.fromEntries(Object.entries(state.rows).map(([id, row]) => [id, row?.phase === "loading" && state.target ? { phase: "done", result: { ...state.target, resolver: id, status: "cancelled", records: [], elapsedMs: 0 } } : row])) });
    },
    dispose() { cancelRequests(); navigationKey = undefined; },
  };
}
