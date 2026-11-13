export const updatePolicy = { warningMs: 72 * 60 * 60_000, expiredMs: 30 * 24 * 60 * 60_000 } as const;
export type UpdateState = { schema: 1; active: string; lastAttemptAt: string; lastSuccessAt: string; outcome: "updated" | "unchanged" | "failed" };
export type UpdateStatus = { state: "current" | "warning" | "expired" | "unavailable" | "unmanaged"; lastCheckedAt: string | null };
export function parseUpdateState(value: unknown): UpdateState {
  const v = value as Partial<UpdateState> | null;
  if (!v || v.schema !== 1 || !/^[a-f0-9]{64}$/.test(v.active ?? "") || !["updated", "unchanged", "failed"].includes(v.outcome ?? "")
    || !Number.isFinite(Date.parse(v.lastAttemptAt ?? "")) || !Number.isFinite(Date.parse(v.lastSuccessAt ?? ""))
    || Date.parse(v.lastAttemptAt!) < Date.parse(v.lastSuccessAt!)) throw new Error("INVALID_UPDATE_STATE");
  return v as UpdateState;
}
export function updateStatus(lastSuccessAt: string | null, now: number): UpdateStatus {
  if (!lastSuccessAt || !Number.isFinite(Date.parse(lastSuccessAt)) || Date.parse(lastSuccessAt) > now + 60_000) return { state: "unavailable", lastCheckedAt: null };
  const age = now - Date.parse(lastSuccessAt);
  return { state: age >= updatePolicy.expiredMs ? "expired" : age >= updatePolicy.warningMs ? "warning" : "current", lastCheckedAt: lastSuccessAt };
}
