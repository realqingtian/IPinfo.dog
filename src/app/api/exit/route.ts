import { handleExit } from "@/server/http/exit-runtime";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = handleExit;
export const HEAD = handleExit;
export const OPTIONS = handleExit;
