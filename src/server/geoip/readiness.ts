import "server-only";
import { geoRuntime } from "./runtime";
import { lookupPolicy } from "./service";

export async function databaseReadiness() {
  if (!geoRuntime.provider.configured()) return "not-configured" as const;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([geoRuntime.provider.get(), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("TIMEOUT")), lookupPolicy.timeoutMs);
    })]);
    return "ready" as const;
  } catch {
    return "unavailable" as const;
  } finally { clearTimeout(timer); }
}
