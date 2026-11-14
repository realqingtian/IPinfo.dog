import { createDnsHandler } from "@/server/dns/handler";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = createDnsHandler();
