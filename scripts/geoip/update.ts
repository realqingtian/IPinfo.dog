import { spawn } from "node:child_process";
import { runUpdate } from "./updater.ts";
const root = process.env.GEOIP_DATABASE_DIR;
const config = process.env.GEOIPUPDATE_CONF_FILE;
if (!root || !config) throw new Error("UPDATE_CONFIGURATION_REQUIRED");
try {
  const result = await runUpdate({ root, download: (stage) => new Promise<void>((resolve, reject) => {
    const child = spawn("geoipupdate", ["-f", config, "-d", stage], { stdio: "ignore", timeout: 10 * 60_000 });
    child.once("error", () => reject(new Error("DOWNLOAD_FAILED")));
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error("DOWNLOAD_FAILED")));
  }) });
  console.log(JSON.stringify(result));
} catch { console.error(JSON.stringify({ ok: false, code: "UPDATE_FAILED" })); process.exitCode = 1; }
