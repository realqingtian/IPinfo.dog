import { spawn } from "node:child_process";
import { runUpdate } from "./updater.ts";
import { readFile } from "node:fs/promises";
import { validateUpdateConfiguration } from "./configuration.ts";
const root = process.env.GEOIP_DATABASE_DIR;
const config = process.env.GEOIPUPDATE_CONF_FILE;
if (!root || !config) throw new Error("UPDATE_CONFIGURATION_REQUIRED");
try {
  const result = await runUpdate({ root, download: (stage) => new Promise<void>((resolve, reject) => {
    void readFile(config, "utf8").then(text => {
      validateUpdateConfiguration(text);
      const child = spawn("geoipupdate", ["-f", config, "-d", stage], { stdio: "ignore", timeout: 10 * 60_000 });
      child.once("error", () => reject(new Error("DOWNLOAD_FAILED")));
      child.once("exit", (code) => code === 0 ? resolve() : reject(new Error("DOWNLOAD_FAILED")));
    }).catch(() => reject(new Error("INVALID_UPDATE_CONFIGURATION")));
  }) });
  console.log(JSON.stringify(result));
} catch { console.error(JSON.stringify({ ok: false, code: "UPDATE_FAILED" })); process.exitCode = 1; }
