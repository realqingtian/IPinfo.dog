import "server-only";
import { readFile } from "node:fs/promises";
import { createIpinfoSource } from "./ipinfo";
import { createDbipSource } from "./dbip";
import { createSourceService } from "./service";
import { createIpSourcesHandler } from "../http/ip-sources-handler";

function createRuntime() {
  const ipinfo = createIpinfoSource({ getToken: async () => {
    // Production uses a read-only secret mount; .env is only a local-development input.
    if (process.env.IPINFO_LITE_TOKEN_FILE) return (await readFile(process.env.IPINFO_LITE_TOKEN_FILE, "utf8")).trim();
    return process.env.IPINFO_LITE_TOKEN;
  } });
  const dbip = createDbipSource({ directory: () => process.env.DBIP_DATABASE_DIR });
  const service = createSourceService({ sources: { ipinfo, dbip } });
  return { handle: createIpSourcesHandler({ lookup: service.lookup }) };
}
const state = globalThis as typeof globalThis & { ipinfoSourcesRuntime?: ReturnType<typeof createRuntime> };
export const ipSourcesRuntime = state.ipinfoSourcesRuntime ??= createRuntime();
