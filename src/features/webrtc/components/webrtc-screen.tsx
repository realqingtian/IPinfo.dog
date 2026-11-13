"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Play, RefreshCw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from "@/components/ui/card";
import { CopyButton } from "@/features/ip/components/copy-button";
import { createWebRtcController, comparison, webrtcPolicy, type IceSlot } from "../detection";

const iceLabels: Record<IceSlot["phase"], string> = {
  idle: "diagnosticIdle", running: "diagnosticRunning", complete: "rtcComplete", timedout: "rtcTimedout",
  cancelled: "diagnosticCancelled", unsupported: "rtcUnsupported", error: "rtcFailed",
};
const exitLabels = { idle: "diagnosticIdle", running: "diagnosticRunning", success: "diagnosticSuccess", error: "diagnosticUnconfirmed", cancelled: "diagnosticCancelled" } as const;
const comparisons = { matching: "rtcMatching", different: "rtcDifferent", unconfirmed: "rtcUnconfirmed", relay: "rtcRelay", local: "rtcLocal" } as const;

export function WebRtcScreen({ urls }: { urls: { ipv4: string; ipv6: string } }) {
  const t = useTranslations("App");
  const [controller] = useState(() => createWebRtcController({ urls }));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getServerSnapshot);
  const [hidden, setHidden] = useState(false);
  useEffect(() => () => controller.dispose(), [controller]);
  const running = state.ice.phase === "running" || Object.values(state.exits).some(exit => exit.phase === "running");
  const started = state.ice.phase !== "idle" || Object.values(state.exits).some(exit => exit.phase !== "idle");
  return <section className="flex min-w-0 flex-col gap-5" data-webrtc="manual">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex flex-col gap-1"><h1 className="text-xl font-semibold tracking-tight">{t("rtcTitle")}</h1><p className="text-sm text-muted-foreground">{t("rtcDescription")}</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={() => setHidden(!hidden)}>{t(hidden ? "diagnosticShow" : "diagnosticHide")}</Button>
        <Button variant="outline" onClick={controller.cancel} disabled={!running}><Square data-icon="inline-start" aria-hidden />{t("diagnosticCancel")}</Button>
        <Button onClick={controller.runAll}>{started ? <RefreshCw data-icon="inline-start" aria-hidden /> : <Play data-icon="inline-start" aria-hidden />}{t(started ? "diagnosticRerun" : "rtcStart")}</Button>
      </div>
    </div>
    <p className="text-xs leading-5 text-muted-foreground">{t("rtcPrivacy")} <span translate="no">{webrtcPolicy.stun}</span></p>
    <div className="grid min-w-0 gap-4 md:grid-cols-2">
      {(["ipv4", "ipv6"] as const).map(family => {
        const exit = state.exits[family], name = family === "ipv4" ? "IPv4" : "IPv6";
        return <Card key={family} className="min-w-0" role="region" aria-label={t("rtcHttps", { protocol: name })}>
          <CardHeader><CardTitle>{t("rtcHttps", { protocol: name })}</CardTitle><CardDescription>{t("rtcHttpsHint")}</CardDescription><CardAction><Button variant="ghost" size="icon" onClick={() => controller.runExit(family)} aria-label={t("diagnosticRetry", { protocol: name })}><RefreshCw aria-hidden /></Button></CardAction></CardHeader>
          <CardContent className="flex min-h-10 min-w-0 items-start gap-2" aria-live="polite" aria-busy={exit.phase === "running"}>
            {exit.address ? <><p translate="no" className="min-w-0 flex-1 break-all font-mono text-xl leading-7 font-medium">{hidden ? "••••••••" : exit.address}</p><CopyButton value={exit.address} label={t("copyAddress", { protocol: name })} /></> : <p>{t(exit.error === "TIMEOUT" ? "diagnosticTimeout" : exit.error === "RATE_LIMITED" ? "rateLimited" : exitLabels[exit.phase])}</p>}
          </CardContent>
          <CardFooter><p className="text-xs leading-5 text-muted-foreground">{t("rtcFamilyHint")}</p></CardFooter>
        </Card>;
      })}
    </div>
    <Card className="min-w-0" role="region" aria-label={t("rtcCandidates")}>
      <CardHeader><CardTitle>{t("rtcCandidates")}</CardTitle><CardDescription>{t("rtcCandidateHint")}</CardDescription><CardAction><Button variant="ghost" size="icon" onClick={controller.runIce} aria-label={t("rtcRetryIce")}><RefreshCw aria-hidden /></Button></CardAction></CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-3" aria-busy={state.ice.phase === "running"}>
        <p role="status" aria-live="polite">{t(iceLabels[state.ice.phase])} · {t("rtcCount", { count: state.ice.candidates.length })}</p>
        {state.ice.candidates.length ? <ul className="flex min-w-0 flex-col gap-3">{state.ice.candidates.map(candidate => <li key={`${candidate.kind}|${candidate.protocol}|${candidate.address}`} className="flex min-w-0 flex-col gap-2 border-t pt-3" data-ice-kind={candidate.kind} data-ice-scope={candidate.scope}>
          <div className="flex min-w-0 items-start gap-2"><p translate="no" className="min-w-0 flex-1 break-all font-mono text-xl leading-7 font-medium">{hidden ? "••••••••" : candidate.address}</p><CopyButton value={candidate.address} label={t("rtcCopyCandidate")} /></div>
          <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{candidate.kind}</Badge><Badge variant="outline">{candidate.scope === "mdns" ? "mDNS" : candidate.family === "ipv4" ? "IPv4" : "IPv6"}</Badge><Badge variant="outline">{candidate.protocol.toUpperCase()}</Badge><span className="text-xs text-muted-foreground">{t(candidate.scope === "public" ? "rtcPublic" : candidate.scope === "mdns" ? "rtcMdns" : "rtcNonpublic")}</span></div>
          <p className="text-sm text-muted-foreground">{t(comparisons[comparison(candidate, state.exits)])}</p>
        </li>)}</ul> : <p className="text-sm text-muted-foreground">{t(state.ice.phase === "idle" ? "rtcIdleHint" : state.ice.phase === "running" ? "rtcGatheringHint" : "rtcNoCandidates")}</p>}
        {state.ice.stunErrors > 0 && <p className="text-sm text-muted-foreground">{t("rtcStunErrors", { count: state.ice.stunErrors })}</p>}
        {state.ice.capped && <p className="text-sm text-muted-foreground">{t("rtcCapped")}</p>}
      </CardContent>
      <CardFooter><p className="text-xs leading-5 text-muted-foreground">{t("rtcTypes")}</p></CardFooter>
    </Card>
    <p className="text-xs leading-5 text-muted-foreground">{t("rtcLimitations")}</p>
  </section>;
}
