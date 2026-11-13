"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import type { UpdateStatus } from "@/server/geoip/update-state";
export function DataUpdateNotice() {
  const t = useTranslations("App");
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  useEffect(() => {
    let active = true, current: AbortController | undefined;
    async function refresh() {
      current?.abort(); const controller = current = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5_000);
      try {
        const response = await fetch("/api/data-status", { cache: "no-store", signal: controller.signal });
        const value = await response.json();
        if (active && current === controller && response.ok && ["current", "warning", "expired", "unavailable", "unmanaged"].includes(value?.state)) setStatus(value);
      } catch { /* Query and exit cards report their own errors; don't fabricate update state. */ }
      finally { clearTimeout(timeout); }
    }
    void refresh(); const timer = setInterval(() => void refresh(), 60_000);
    return () => { active = false; current?.abort(); clearInterval(timer); };
  }, []);
  if (!status || ["current", "unmanaged"].includes(status.state)) return null;
  return <Alert><AlertTitle>{t(status.state === "warning" ? "dataUpdateWarning" : "dataUpdatePaused")}</AlertTitle>
    <AlertDescription>{t(status.state === "warning" ? "dataUpdateWarningDetail" : "dataUpdatePausedDetail")}</AlertDescription>
  </Alert>;
}
