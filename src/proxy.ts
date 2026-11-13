import { NextResponse, type NextRequest } from "next/server";
import { chooseLocale, localeCookie } from "./i18n/config";

/** Response metadata only: never redirect, rewrite or introduce locale routes. */
export function proxy(request: NextRequest) {
  const locale = chooseLocale(request.cookies.get(localeCookie)?.value,
    request.headers.get("accept-language") ?? "");
  const response = NextResponse.next();
  response.headers.set("Content-Language", locale);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.append("Vary", "Cookie, Accept-Language");
  return response;
}

export const config = { matcher: ["/", "/ip"] };
