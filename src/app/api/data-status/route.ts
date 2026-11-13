import { geoRuntime } from "@/server/geoip/runtime";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json(await geoRuntime.updateStatus(), { headers: { "Cache-Control": "private, no-store", "CDN-Cache-Control": "no-store", "Cross-Origin-Resource-Policy": "same-origin" } });
}
