export function coreCors(request: Request) {
  const allowed = process.env.IPINFO_WEB_ORIGIN ?? "https://ipinfo.dog";
  const origin = request.headers.get("Origin");
  const headers: Record<string, string> = { "Cache-Control": "private, no-store", "CDN-Cache-Control": "no-store", "Vary": "Origin", "Cross-Origin-Resource-Policy": "same-site", "X-Content-Type-Options": "nosniff" };
  if (origin && origin !== allowed) return { headers, response: Response.json({ ok: false, error: { code: "ACCESS_DENIED" } }, { status: 403, headers }) };
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  if (request.method === "OPTIONS") {
    if (!origin || request.headers.get("Access-Control-Request-Method") !== "GET" || request.headers.get("Access-Control-Request-Headers")) return { headers, response: new Response(null, { status: 403, headers }) };
    return { headers, response: new Response(null, { status: 204, headers: { ...headers, "Access-Control-Allow-Methods": "GET", "Access-Control-Max-Age": "0" } }) };
  }
  return { headers, response: null };
}
