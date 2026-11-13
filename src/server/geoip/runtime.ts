import "server-only";
import { createDatasetProvider } from "./provider";
import { createLookupService } from "./service";
import { createIpHandler } from "../http/ip-handler";
import { createManagedDatasetProvider } from "./managed";

function createRuntime() {
  const options = { directory: () => process.env.GEOIP_DATABASE_DIR };
  const managed = process.env.GEOIP_MANAGED === "1" ? createManagedDatasetProvider(options) : undefined;
  const provider = managed ?? createDatasetProvider(options);
  const service = createLookupService({ getDataset: provider.get });
  const updateStatus = () => managed ? managed.status() : Promise.resolve({ state: "unmanaged" as const, lastCheckedAt: null });
  return { provider, updateStatus, handleIp: createIpHandler({ lookup: service.lookup }) };
}

// Next route bundles share one runtime per Node process, not separate dataset copies.
const processState = globalThis as typeof globalThis & { ipinfoGeoRuntime?: ReturnType<typeof createRuntime> };
export const geoRuntime = processState.ipinfoGeoRuntime ??= createRuntime();
