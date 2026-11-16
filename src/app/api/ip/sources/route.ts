import { ipSourcesRuntime } from "@/server/ip-sources/runtime";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = ipSourcesRuntime.handle;
export const OPTIONS = ipSourcesRuntime.handle;
