import { createProviderIconSource } from "@/server/provider-icon";
import { createProviderIconHandler } from "@/server/http/provider-icon-handler";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const handle = createProviderIconHandler({ lookup: createProviderIconSource() });
export const GET = handle;
export const OPTIONS = handle;
