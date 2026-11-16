import "server-only";
import { readFile } from "node:fs/promises";
import { createExitHandler } from "./exit-handler";
let pending: Promise<string | null> | undefined;
async function token() {
  const path = process.env.IPINFO_EXIT_TOKEN_FILE;
  if (!path) return null;
  pending ??= readFile(path, "utf8").then((value) => /^[A-Za-z0-9_-]{32,256}$/.test(value.trim()) ? value.trim() : null).catch(() => { pending = undefined; return null; });
  return pending;
}
const state = globalThis as typeof globalThis & { ipinfoConnectionHandler?: ReturnType<typeof createExitHandler> };
export const handleConnection = state.ipinfoConnectionHandler ??= createExitHandler({ token });
