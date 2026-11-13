import "server-only";
import { loadDataset } from "./dataset";

let pending: ReturnType<typeof loadDataset> | undefined;

export async function databaseReadiness() {
  const directory = process.env.GEOIP_DATABASE_DIR;
  if (!directory) return "not-configured" as const;
  try {
    pending ??= loadDataset(directory);
    await pending;
    return "ready" as const;
  } catch {
    pending = undefined;
    return "unavailable" as const;
  }
}
