import type { SourceRecord } from "../../lib/contracts/ip-sources.ts";
export function sourceDateLabel(record: Pick<SourceRecord, "dataDates">): string | null {
  const dates = [...new Set(record.dataDates.map(item => item.date.slice(0, 10)))].sort();
  if (!dates.length) return null;
  const first = dates[0], last = dates.at(-1)!;
  if (first === last) return first;
  return `${first}–${first.slice(0, 7) === last.slice(0, 7) ? last.slice(8) : last}`;
}
