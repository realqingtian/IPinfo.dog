import { parseIp } from "../../lib/ip.ts";
import type { IpInformation } from "../../lib/contracts/ip.ts";
export const historyKey = "ipinfo-recent-queries-v1";
export function cleanHistory(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  for (const item of value.slice(0, 100)) {
    if (typeof item !== "string") continue;
    try { const parsed = parseIp(item); if (parsed.isPublic && !result.includes(parsed.address)) result.push(parsed.address); } catch { /* Ignore corrupt entries. */ }
    if (result.length === 10) break;
  }
  return result;
}
type StoragePort = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export function createHistoryStore(storage: () => StoragePort) {
  const initial = { items: [] as string[], available: true, clearFailed: false };
  let state = initial;
  const listeners = new Set<() => void>();
  const publish = (next: typeof initial) => { state = next; listeners.forEach((listener) => listener()); };
  function read() { const raw = storage().getItem(historyKey); if (!raw || raw.length > 8192) return []; try { return cleanHistory(JSON.parse(raw)); } catch { return []; } }
  return {
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => state, getServerSnapshot: () => initial,
    load() { try { publish({ items: read(), available: true, clearFailed: false }); } catch { publish({ ...state, available: false }); } },
    record(result: IpInformation) {
      if (result.datasetId === "interface-demo" || !result.sources.some((source) => source.found)) return;
      try {
        const target = parseIp(result.address); if (!target.isPublic) return;
        let previous = state.items; try { previous = read(); } catch { /* Keep memory entries. */ }
        const items = cleanHistory([target.address, ...previous]); let available = true;
        try { storage().setItem(historyKey, JSON.stringify(items)); } catch { available = false; }
        publish({ items, available, clearFailed: false });
      } catch { /* Invalid result never enters history. */ }
    },
    clear() { try { storage().removeItem(historyKey); publish({ items: [], available: true, clearFailed: false }); } catch { publish({ ...state, available: false, clearFailed: true }); } },
  };
}
