import { geoRuntime } from "@/server/geoip/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = geoRuntime.handleIp;
