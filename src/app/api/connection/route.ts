import { handleConnection } from "@/server/http/exit-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = handleConnection;
export const HEAD = handleConnection;
