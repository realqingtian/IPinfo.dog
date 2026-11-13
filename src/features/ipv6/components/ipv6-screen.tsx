"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw, Square, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { CopyButton } from "@/features/ip/components/copy-button";
import { createDiagnostics, diagnosticKeys, measureProbe, readiness, type DiagnosticKey } from "../diagnostics";

const phases = { idle: "diagnosticIdle", running: "diagnosticRunning", success: "diagnosticSuccess", error: "diagnosticUnconfirmed", cancelled: "diagnosticCancelled" } as const;
const summaries = { dual: "diagnosticDual", v4Observed: "diagnosticV4Observed", v6Observed: "diagnosticV6Observed", running: "diagnosticRunning", unconfirmed: "diagnosticUnconfirmed" } as const;

export function Ipv6Screen({ urls }: { urls: Record<DiagnosticKey, string> }) {
  const t = useTranslations("App");
  const [controller] = useState(() => createDiagnostics({ measure: (key, signal) => measureProbe(urls[key], key, signal) }));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getServerSnapshot);
  const [hidden, setHidden] = useState(false);
  const running = diagnosticKeys.some((key) => state[key].phase === "running");
  useEffect(() => { controller.runAll(); return () => controller.dispose(); }, [controller]);
  const label = (key: DiagnosticKey) => key === "connection" ? t("diagnosticConnection") : key === "ipv4" ? "IPv4" : "IPv6";
  return <section className="flex min-w-0 flex-col gap-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex flex-col gap-1"><h1 className="text-xl font-semibold tracking-tight">{t("ipv6Title")}</h1><p className="text-sm text-muted-foreground">{t("ipv6Description")}</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={() => setHidden(!hidden)}>{t(hidden ? "diagnosticShow" : "diagnosticHide")}</Button>
        <Button variant="outline" onClick={controller.cancel} disabled={!running}><Square data-icon="inline-start" aria-hidden />{t("diagnosticCancel")}</Button>
        <Button onClick={controller.runAll}><RefreshCw data-icon="inline-start" aria-hidden />{t("diagnosticRerun")}</Button>
      </div>
    </div>
    <div className="flex flex-col gap-1" role="status" aria-live="polite"><p className="font-medium">{t(summaries[readiness(state)])}</p><p className="text-sm text-muted-foreground">{t("diagnosticSummaryHint")}</p></div>
    <div className="grid min-w-0 gap-4 md:grid-cols-2">
      {diagnosticKeys.map((key) => {
        const slot = state[key], measurement = slot.measurement, name = label(key);
        return <Card key={key} className={key === "connection" ? "min-w-0 md:col-span-2" : "min-w-0"} role="region" aria-label={t("diagnosticCard", { protocol: name })}>
          <CardHeader><CardTitle className="flex flex-wrap items-center gap-2">{name}<Badge variant="secondary">{t(phases[slot.phase])}</Badge></CardTitle>
            <CardDescription>{t(key === "connection" ? "diagnosticConnectionHint" : "diagnosticDirectHint")}</CardDescription>
            <CardAction><Button variant="ghost" size="icon" onClick={() => controller.run(key)} aria-label={t("diagnosticRetry", { protocol: name })}><RefreshCw aria-hidden /></Button></CardAction>
          </CardHeader>
          <CardContent className="flex min-w-0 flex-col gap-3" aria-live="polite" aria-busy={slot.phase === "running"}>
            {measurement ? <>
              <div className="flex min-w-0 items-start gap-2"><p translate="no" className="min-w-0 flex-1 break-all font-mono text-xl leading-7 font-medium">{hidden ? "••••••••" : measurement.data.address}</p><CopyButton value={measurement.data.address} label={t("copyAddress", { protocol: name })} /></div>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm"><dt className="text-muted-foreground">{t("diagnosticProtocol")}</dt><dd>{measurement.data.family === "ipv4" ? "IPv4" : "IPv6"}</dd><dt className="text-muted-foreground">{t("diagnosticDuration")}</dt><dd>{measurement.elapsedMs} ms</dd></dl>
            </> : <p className="flex min-h-14 items-center gap-2 text-sm">{slot.phase === "running" && <Spinner aria-hidden />}{t(slot.error === "TIMEOUT" ? "diagnosticTimeout" : slot.error === "RATE_LIMITED" ? "rateLimited" : slot.phase === "error" ? "diagnosticFailed" : phases[slot.phase])}</p>}
          </CardContent>
          <CardFooter><p className="text-xs leading-5 text-muted-foreground">{t(key === "connection" ? "diagnosticConnectionScope" : "diagnosticDirectScope")}</p></CardFooter>
        </Card>;
      })}
    </div>
    <div className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><Network className="size-4 shrink-0" aria-hidden /><p>{t("diagnosticLimitations")}</p></div>
  </section>;
}
