import { databaseReadiness } from "@/server/geoip/readiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const database = await databaseReadiness();
  return Response.json({ status: database === "unavailable" ? "degraded" : "ok", database }, {
    status: database === "unavailable" ? 503 : 200,
    headers: { "Cache-Control": "private, no-store" },
  });
}
