import "server-only";
import { createDatasetProvider } from "./provider";
import { createLookupService } from "./service";
import { createIpHandler } from "../http/ip-handler";

function createRuntime() {
  const provider = createDatasetProvider({ directory: () => process.env.GEOIP_DATABASE_DIR });
  const service = createLookupService({ getDataset: provider.get });
  return { provider, handleIp: createIpHandler({ lookup: service.lookup }) };
}

// Next route bundles share one runtime per Node process, not separate dataset copies.
const processState = globalThis as typeof globalThis & { ipinfoGeoRuntime?: ReturnType<typeof createRuntime> };
export const geoRuntime = processState.ipinfoGeoRuntime ??= createRuntime();
