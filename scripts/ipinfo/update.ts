import { readFile } from "node:fs/promises";
import { runIpinfoUpdate } from "./updater.ts";
import { downloadIpinfo } from "./download.ts";
try {
  const root = process.env.IPINFO_DATABASE_DIR;
  const token = process.env.IPINFO_LITE_TOKEN_FILE ? (await readFile(process.env.IPINFO_LITE_TOKEN_FILE, "utf8")).trim() : process.env.IPINFO_LITE_TOKEN;
  if (!root || !token) throw Error("CONFIGURATION_REQUIRED");
  console.log(JSON.stringify(await runIpinfoUpdate({ root, acquire: stage => downloadIpinfo(stage, token) })));
} catch { console.error(JSON.stringify({ ok: false, code: "IPINFO_UPDATE_FAILED" })); process.exitCode = 1; }
