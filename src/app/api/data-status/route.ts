import { geoRuntime } from "@/server/geoip/runtime";
import { coreCors } from "@/server/http/cors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const cors = coreCors(request);
  if (cors.response) return cors.response;
  return Response.json(await geoRuntime.updateStatus(), { headers: cors.headers });
}
export const OPTIONS = GET;
