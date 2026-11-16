import { createIpinfoProvider } from "@/server/ipinfo/database";
import { createIpinfoHandler } from "@/server/ipinfo/handler";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const state = globalThis as typeof globalThis & { ipinfoLocalHandle?: ReturnType<typeof createIpinfoHandler> };
const handle = state.ipinfoLocalHandle ??= createIpinfoHandler({ lookup: createIpinfoProvider({ directory: () => process.env.IPINFO_DATABASE_DIR }).lookup });
export const GET = handle;
export const OPTIONS = handle;
