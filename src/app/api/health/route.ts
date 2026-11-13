import { databaseReadiness } from "@/server/geoip/readiness";
import { geoRuntime } from "@/server/geoip/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const database = await databaseReadiness();
  return Response.json({ status: database === "ready" ? "ok" : "degraded", database, updates: await geoRuntime.updateStatus() }, {
    status: database === "ready" ? 200 : 503,
    headers: { "Cache-Control": "private, no-store" },
  });
}
