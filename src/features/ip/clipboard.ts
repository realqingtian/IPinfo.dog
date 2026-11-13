/** Preserve the full original value; never report success when browser write rejects. */
export async function attemptCopy(value: string | (() => string), write: (text: string) => Promise<void>) {
  try { await write(typeof value === "function" ? value() : value); return "success" as const; }
  catch { return "error" as const; }
}
