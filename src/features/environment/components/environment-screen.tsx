"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Play, RefreshCw, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { DetectionHelp } from "@/components/layout/detection-help";
import { CopyButton } from "@/features/ip/components/copy-button";
import { collectEnvironment } from "../browser";
import { compareEnvironment, createEnvironmentController, environmentGroups, requestHeaderNames, type RequestView, type EnvironmentValue } from "../environment";

export function EnvironmentScreen({ requestHeaders }: { requestHeaders: RequestView }) {
  const t = useTranslations("App");
  const [controller] = useState(() => createEnvironmentController(collectEnvironment));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getServerSnapshot);
  useEffect(() => () => controller.clear(), [controller]);
  const format = (value: EnvironmentValue | undefined) => value == null ? t("envUnavailable") : typeof value === "boolean" ? t(value ? "envYes" : "envNo") : String(value);
  const comparison = compareEnvironment(state.values, requestHeaders);
  return <section className="flex min-w-0 flex-col gap-5" data-environment="manual">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex flex-col gap-1"><h1 className="text-xl font-semibold tracking-tight">{t("envTitle")}</h1><p className="text-sm text-muted-foreground">{t("envDescription")}</p></div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={controller.clear} disabled={state.phase === "idle"}><Trash2 data-icon="inline-start" aria-hidden />{t("envClear")}</Button>
        <Button onClick={controller.run} disabled={state.phase === "running"}>{state.phase === "idle" ? <Play data-icon="inline-start" aria-hidden /> : <RefreshCw data-icon="inline-start" aria-hidden />}{t(state.phase === "running" ? "envRunning" : state.phase === "idle" ? "envStart" : "envRerun")}</Button>
      </div>
    </div>
    <p className="text-xs text-muted-foreground">{t("envPrivacy")}</p>
    <div role="status" aria-live="polite">{state.phase !== "complete" && <p className="text-sm text-muted-foreground">{t(state.phase === "idle" ? "envIdle" : state.phase === "running" ? "envRunning" : "envFailed")}</p>}</div>
    {state.phase === "complete" && <>
      <div className="grid min-w-0 gap-4 md:grid-cols-2">{Object.entries(environmentGroups).map(([group, fields]) => <Card key={group} className="min-w-0" role="region" aria-label={t(`envGroup_${group}`)}>
        <CardHeader><CardTitle>{t(`envGroup_${group}`)}</CardTitle></CardHeader>
        <CardContent><dl className="flex min-w-0 flex-col gap-3">{fields.map(field => <div key={field} className="grid min-w-0 grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-3" data-environment-field={field}>
          <dt className="text-muted-foreground">{t(`envField_${field}`)}</dt><dd className="min-w-0 break-all" translate="no">{format(state.values[field])}</dd>
        </div>)}</dl></CardContent>
      </Card>)}
      <Card className="min-w-0" role="region" aria-label={t("envComparison")}><CardHeader><CardTitle>{t("envComparison")}</CardTitle></CardHeader><CardContent className="flex flex-col gap-4">
        {(["userAgent", "language"] as const).map(key => <div key={key} className="flex flex-wrap items-center justify-between gap-2"><span>{t(`envField_${key}`)}</span><Badge variant="secondary">{t(`envCompare_${comparison[key]}`)}</Badge></div>)}
        <p className="text-xs text-muted-foreground">{t("envComparisonHint")}</p>
      </CardContent></Card></div>
      <Card className="min-w-0"><CardHeader><CardTitle>User-Agent</CardTitle></CardHeader><CardContent className="flex min-w-0 items-start gap-2"><p translate="no" className="min-w-0 flex-1 break-all text-sm">{format(state.values.userAgent)}</p>{typeof state.values.userAgent === "string" && <CopyButton value={state.values.userAgent} label={t("envCopyUa")} />}</CardContent></Card>
    </>}
    <Collapsible className="min-w-0"><CollapsibleTrigger asChild><Button variant="ghost">{t("envRequest")}<ChevronDown data-icon="inline-end" aria-hidden /></Button></CollapsibleTrigger><CollapsibleContent className="min-w-0 py-3">
      <dl className="flex min-w-0 flex-col gap-3">{requestHeaderNames.map(key => <div key={key} className="flex min-w-0 flex-col gap-1"><dt className="text-xs text-muted-foreground" translate="no">{key}</dt><dd className="break-all text-sm" translate="no">{format(requestHeaders[key])}</dd></div>)}</dl>
    </CollapsibleContent></Collapsible>
    <DetectionHelp><p>{t("envLimits")}</p><p>{t("envGraphicsHint")}</p><p>{t("envRequestHint")}</p></DetectionHelp>
  </section>;
}
