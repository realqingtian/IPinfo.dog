"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Play, RefreshCw, Square, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { CopyButton } from "@/features/ip/components/copy-button";
import { createRoutingController, groupExits } from "../controller";
import { probeRoutingTarget } from "../probe";
import { routingCategories, type RoutingCategory, type RoutingTarget } from "../catalog";

const categoryKeys = { domestic: "routingDomestic", social: "routingSocial", ai: "routingAi", crypto: "routingCrypto", tools: "routingTools", dev: "routingDev", media: "routingMedia", all: "routingAll" } as const;
const phaseKeys = { idle: "diagnosticIdle", queued: "routingQueued", running: "diagnosticRunning", success: "routingConfirmed", error: "diagnosticUnconfirmed", cancelled: "diagnosticCancelled" } as const;
const errorKeys = { TIMEOUT: "routingTimeout", CANCELLED: "diagnosticCancelled", REQUEST_FAILED: "routingRequestFailed", HTTP_ERROR: "routingHttpError", NO_IP: "routingNoIp", INVALID_DATA: "routingInvalidData", TOO_LARGE: "routingTooLarge" } as const;
const brandKeys = { netease: "routingNetease", bytedance: "routingBytedance", "cloudflare-cn-com": "routingCloudflareChina", "qualcomm-cn": "routingQualcommChina" } as const;

export function RoutingScreen({ targets, fixture = false }: { targets: readonly RoutingTarget[]; fixture?: boolean }) {
  const t = useTranslations("App");
  const [controller] = useState(() => createRoutingController({ targets, probe: probeRoutingTarget }));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getServerSnapshot);
  const [category, setCategory] = useState<RoutingCategory | "all">("all"), [hidden, setHidden] = useState(false);
  useEffect(() => () => controller.dispose(), [controller]);
  const started = Object.values(state).some(s => s.phase !== "idle");
  const running = Object.values(state).some(s => s.phase === "running" || s.phase === "queued");
  const done = Object.values(state).filter(s => ["success", "error", "cancelled"].includes(s.phase)).length;
  const confirmed = Object.values(state).filter(s => s.phase === "success").length;
  const grouping = groupExits(targets, state);
  const name = (target: RoutingTarget) => target.id in brandKeys ? t(brandKeys[target.id as keyof typeof brandKeys]) : target.name;
  return <section className="flex min-w-0 flex-col gap-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex flex-col gap-1"><h1 className="text-xl font-semibold tracking-tight">{t("routingTitle")}</h1><p className="text-sm text-muted-foreground">{t("routingDescription")}</p>{fixture && <Badge variant="outline">{t("routingFixture")}</Badge>}</div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={() => setHidden(!hidden)}>{t(hidden ? "diagnosticShow" : "diagnosticHide")}</Button>
        <Button variant="outline" disabled={!running} onClick={controller.cancel}><Square data-icon="inline-start" aria-hidden />{t("diagnosticCancel")}</Button>
        <Button onClick={controller.runAll}>{started ? <RefreshCw data-icon="inline-start" aria-hidden /> : <Play data-icon="inline-start" aria-hidden />}{t(started ? "diagnosticRerun" : "routingStart")}</Button>
      </div>
    </div>
    <p className="text-xs leading-5 text-muted-foreground">{t("routingConsent")}</p>
    <Card role="region" aria-label={t("routingSummary")}>
      <CardHeader><CardTitle><h2>{t("routingSummary")}</h2></CardTitle><CardDescription aria-live="polite">{t("routingStats", { done, total: targets.length, confirmed })}</CardDescription></CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-3">
        <p role="status" className="text-sm">{t(!confirmed ? "routingNone" : grouping.multipleExits ? "routingMultiple" : "routingNoMultiple")}</p>
        {!!grouping.groups.length && <ul className="grid min-w-0 gap-3 md:grid-cols-2">{grouping.groups.map(group => <li key={`${group.family}:${group.address}`} className="flex min-w-0 flex-col gap-2 rounded-md border p-3">
          <div className="flex items-center gap-2"><Badge variant="secondary">{group.family === "ipv4" ? "IPv4" : "IPv6"}</Badge><span className="text-xs text-muted-foreground">{t("routingGroupCount", { count: group.targets.length })}</span></div>
          <div className="flex min-w-0 items-start gap-2"><p translate="no" className="min-w-0 flex-1 break-all font-mono text-xl leading-7 font-medium">{hidden ? "••••••••" : group.address}</p><CopyButton value={group.address} label={t("copyAddress", { protocol: group.family === "ipv4" ? "IPv4" : "IPv6" })} /></div>
          <p className="break-words text-xs leading-5 text-muted-foreground">{group.targets.map(name).join(" · ")}</p>
        </li>)}</ul>}
      </CardContent><CardFooter><p className="text-xs leading-5 text-muted-foreground">{t("routingGroupHint")}</p></CardFooter>
    </Card>
    <Card role="region" aria-label={t("routingTargets")}>
      <CardHeader><CardTitle><h2>{t("routingTargets")}</h2></CardTitle><CardDescription>{t("routingFilterHint")}</CardDescription>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="w-fit" aria-label={t("routingCategory")}><span>{t(categoryKeys[category])}</span><ChevronDown data-icon="inline-end" aria-hidden /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="start"><DropdownMenuRadioGroup value={category} onValueChange={value => { if (value === "all" || routingCategories.some(c => c === value)) setCategory(value as RoutingCategory | "all"); }}>
            {(["all", ...routingCategories] as const).map(value => <DropdownMenuRadioItem key={value} value={value}>{t(categoryKeys[value])}</DropdownMenuRadioItem>)}
          </DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>
      </CardHeader>
      <CardContent className="px-0"><ul className="min-w-0">{targets.filter(target => category === "all" || target.category === category).map(target => {
        const slot = state[target.id], measurement = slot.measurement, label = name(target);
        return <li key={target.id} data-target={target.id} className="grid min-w-0 gap-3 border-b px-4 py-3 last:border-0 sm:grid-cols-[minmax(8rem,1fr)_minmax(0,2fr)_auto] sm:items-center">
          <div className="min-w-0"><p className="break-words text-sm font-medium">{label}</p><p translate="no" className="break-all text-xs text-muted-foreground">{new URL(target.url).host}</p></div>
          <div className="flex min-w-0 flex-col gap-1" aria-live="polite"><div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{t(phaseKeys[slot.phase])}</Badge>{measurement && <span className="text-xs text-muted-foreground">{measurement.family === "ipv4" ? "IPv4" : "IPv6"} · {measurement.elapsedMs} ms</span>}</div>
            {measurement && <div className="flex min-w-0 items-center gap-2"><p translate="no" className="min-w-0 flex-1 break-all font-mono text-sm">{hidden ? "••••••••" : measurement.address}</p><CopyButton value={measurement.address} label={t("routingCopy", { name: label })} /><Button asChild variant="ghost" size="sm"><Link href={`/ip?ip=${encodeURIComponent(measurement.address)}`}>{t("query")}</Link></Button></div>}
            {slot.error && slot.error !== "CANCELLED" && <p className="text-xs leading-5 text-muted-foreground">{t(errorKeys[slot.error], { status: slot.status ?? "" })}</p>}
          </div>
          <Button variant="outline" size="sm" className="w-fit" onClick={() => controller.retry(target.id)} aria-label={t("routingRetry", { name: label })}><RefreshCw data-icon="inline-start" aria-hidden />{t(slot.phase === "idle" ? "routingTestOne" : "routingRetryOne")}</Button>
        </li>;
      })}</ul></CardContent><CardFooter><p className="text-xs leading-5 text-muted-foreground">{t("routingLimitations")}</p></CardFooter>
    </Card>
  </section>;
}
