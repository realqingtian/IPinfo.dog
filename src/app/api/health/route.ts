import { databaseReadiness } from "@/server/geoip/readiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const database = await databaseReadiness();
  return Response.json({ status: database === "ready" ? "ok" : "degraded", database }, {
    status: database === "ready" ? 200 : 503,
    headers: { "Cache-Control": "private, no-store" },
  });
}
