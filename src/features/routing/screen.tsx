"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { RegionFlag } from "@/components/region-flag";
import { usePreferences } from "@/components/providers/preferences";
import { SourceLink } from "@/features/ip/components/source-link";
import { StableIpAddress } from "@/features/ip/components/stable-ip-address";
import { CopyButton } from "@/features/ip/components/copy-button";
import { localizedCountry } from "@/features/ip/presentation";
import { queryPath } from "@/features/ip/query";
import { routingTargets, routingGroups, type RoutingGroup } from "./catalog";
import { compareReference, createRoutingController, routingSummary, type RoutingResult, type RoutingRow } from "./detection";

export function RoutingScreen() {
  const t = useTranslations("Routing"), app = useTranslations("App"), { locale } = usePreferences();
  const [controller] = useState(() => createRoutingController());
  const rows = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getServerSnapshot);
  const [filter, setFilter] = useState<"all" | RoutingGroup>("all"), [hidden, setHidden] = useState(false);
  const summary = routingSummary(rows), running = summary.pending > 0;
  useEffect(() => { controller.refresh(); return () => controller.dispose(); }, [controller]);
  const country = (result: RoutingResult) => result.country ? localizedCountry({ code: result.country, names: {} }, locale) : app("unknown");
  function address(result: RoutingResult) {
    return <Link href={queryPath(result.address)} prefetch={false} className="routing-ip" aria-label={hidden ? t("queryAddress") : undefined}><StableIpAddress address={result.address} hidden={hidden} /></Link>;
  }
  const stateLabel = (row: RoutingRow) => row.phase !== "done" ? t(row.phase === "idle" ? "waiting" : row.phase === "queued" ? "queued" : "detecting") : row.outcome.ok ? "" : t(`errors.${row.outcome.code}`);
  return <section className="ip-screen" data-routing-screen>
    <Card className="report-card routing-card">
      <CardHeader className="routing-header">
        <div className="min-w-0"><CardTitle><h1 className="routing-title">{t("title")}</h1></CardTitle><p className="report-meta routing-description">{t("description")}</p></div>
        <div className="routing-actions">
          <Button variant="ghost" size="icon" aria-label={hidden ? t("showAddresses") : t("hideAddresses")} title={hidden ? t("showAddresses") : t("hideAddresses")} onClick={() => setHidden(value => !value)}>{hidden ? <EyeOff aria-hidden /> : <Eye aria-hidden />}</Button>
          <Button variant="outline" size="sm" onClick={controller.refresh}><RefreshCw data-icon="inline-start" className={running ? "routing-refresh-active" : undefined} aria-hidden />{t("refresh")}</Button>
        </div>
      </CardHeader>
      <CardContent className="routing-content">
        <div className="routing-summary" aria-label={t("summary")}>
          <div><h2 className="report-section-title">{t("observedExits")}</h2><p className="report-data">IPv4 <strong>{summary.ipv4}</strong><span className="routing-divider">/</span>IPv6 <strong>{summary.ipv6}</strong></p><p className="report-meta">{t("familyNote")}</p></div>
          <div><h2 className="report-section-title">{t("coverage")}</h2><p className="report-data">{t("successCount", { count: summary.success, total: routingTargets.length })}</p><p className="report-meta" role="status" aria-live="polite">{running ? t("progress", { count: summary.done, total: routingTargets.length }) : summary.done ? t("finished") : t("waiting")}</p></div>
          <div><h2 className="report-section-title">{t("observation")}</h2><p className="report-data">{summary.different ? t("multipleExits") : running ? t("detecting") : summary.success ? t("sameObservedExit") : t("noResult")}</p><p className="report-meta">{t("observationNote")}</p></div>
        </div>
        <section className="routing-exits" aria-labelledby="routing-exits-heading">
          <h2 id="routing-exits-heading" className="report-section-title">{t("exitSummary")}</h2>
          {summary.groups.length ? <ul className="routing-exit-list">{summary.groups.map(({ result, sites }, index) => <li key={result.address}>
            <span className="report-meta">{t("exitNumber", { number: index + 1 })}</span>
            {address(result)}
            <span className="report-meta">{result.family === "ipv4" ? "IPv4" : "IPv6"} · {t("siteCount", { count: sites })}</span>
            <CopyButton value={result.address} label={t("copyAddress")} />
          </li>)}</ul> : <p className="report-meta">{running ? t("awaitingExits") : t("emptyHint")}</p>}
        </section>
        <section className="routing-results" aria-labelledby="routing-results-heading">
          <h2 id="routing-results-heading" className="report-section-title">{t("siteResults")}</h2>
          <ToggleGroup type="single" value={filter} size="sm" variant="outline" aria-label={t("filterLabel")} className="routing-filters" onValueChange={value => { if (value === "all" || routingGroups.includes(value as RoutingGroup)) setFilter(value as typeof filter); }}>
            {(["all", ...routingGroups] as const).map(group => <ToggleGroupItem key={group} value={group}>{t(`groups.${group}`)}<span className="routing-filter-count">{group === "all" ? routingTargets.length : routingTargets.filter(target => target.group === group).length}</span></ToggleGroupItem>)}
          </ToggleGroup>
          <table className="report-table routing-table report-data">
            <caption className="sr-only">{t("tableDescription")}</caption>
            <colgroup><col className="routing-col-site" /><col className="routing-col-ip" /><col className="routing-col-region" /><col className="routing-col-time" /><col className="routing-col-status" /></colgroup>
            <thead className="report-table-label"><tr><th scope="col">{t("site")}</th><th scope="col"><span className="routing-desktop">{t("egress")}</span><span className="routing-mobile">{t("result")}</span></th><th scope="col" className="routing-desktop">{t("regionNode")}</th><th scope="col" className="routing-desktop">{t("duration")}</th><th scope="col" className="routing-desktop">{t("comparison")}</th></tr></thead>
            <tbody>{routingTargets.filter(target => filter === "all" || target.group === filter).map(target => {
              const row = rows[target.id], result = row.phase === "done" && row.outcome.ok ? row.outcome.data : null;
              const comparison = result ? (target.group === "reference" ? "reference" : compareReference(result, rows)) : null;
              const region = result ? <span className="routing-region">{result.country && <RegionFlag code={result.country} size={12} />}<span>{country(result)}{result.colo && <span className="report-meta"> · {result.colo}</span>}</span></span> : null;
              return <tr key={target.id} data-routing-target={target.id} data-phase={row.phase} data-family={result?.family}>
                <th scope="row"><SourceLink href={target.href} label={target.label} /><span className="routing-group report-meta">{t(`groups.${target.group}`)}</span></th>
                <td>{result ? <><span className="routing-row-state">{address(result)}<Button size="icon" variant="ghost" aria-label={t("retrySite", { site: target.label })} title={t("retrySite", { site: target.label })} onClick={() => controller.retry(target.id)}><RefreshCw aria-hidden /></Button></span><span className="routing-mobile routing-mobile-meta">{region}<span>{result.family === "ipv4" ? "IPv4" : "IPv6"} · {result.elapsedMs} ms · {t(`compare.${comparison}`)}</span></span></> : <span className="routing-row-state">{row.phase === "loading" || row.phase === "queued" ? <><Skeleton className="routing-address-skeleton" /><span className="sr-only">{stateLabel(row)}</span></> : <span className="report-meta">{stateLabel(row)}</span>}{row.phase === "done" && <Button size="icon" variant="ghost" aria-label={t("retrySite", { site: target.label })} title={t("retrySite", { site: target.label })} onClick={() => controller.retry(target.id)}><RefreshCw aria-hidden /></Button>}</span>}</td>
                <td className="routing-desktop">{region ?? <span aria-hidden>—</span>}</td>
                <td className="routing-desktop report-meta">{result ? `${result.elapsedMs} ms` : "—"}</td>
                <td className="routing-desktop report-meta">{comparison ? t(`compare.${comparison}`) : "—"}</td>
              </tr>;
            })}</tbody>
          </table>
        </section>
        <p className="report-meta routing-note">{t("note")}</p>
      </CardContent>
    </Card>
  </section>;
}
