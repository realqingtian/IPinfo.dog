"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { RegionFlag } from "@/components/region-flag";
import { usePreferences } from "@/components/providers/preferences";
import { extraSourceIds, maxmindSource, sourceLabels, sourceLinks, type SourceId, type SourceRecord } from "@/lib/contracts/ip-sources";
import type { IpInformation } from "@/lib/contracts/ip";
import { createSourcesController, type SourceRowState } from "../sources";
import { localizedName, displayTime } from "../presentation";
import { sourceDateLabel } from "../source-dates";

import { regions, sourceRegion } from "../comparison-regions";
import { echoProviders, ipipProvider, type ComparisonRows } from "../protocol-probe";
import { EchoTableRow } from "./exit-comparison";

type GeoRow = [SourceId, SourceRowState];

export function SourceComparison({ address, information, primaryLoading = false, revision = 0, onProviderRecord, echoRows, hidden }: {
  echoRows?: ComparisonRows; hidden?: boolean;
  address: string; information: IpInformation | null; primaryLoading?: boolean; revision?: number; onProviderRecord?: (record: SourceRecord | null) => void;
}) {
  const [controller] = useState(() => createSourcesController(address));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getServerSnapshot);
  useEffect(() => { controller.refresh(revision > 0); return () => controller.dispose(); }, [controller, revision]);
  useEffect(() => {
    const record = extraSourceIds.map(id => state[id]).find(row => row.phase === "done" && row.outcome.ok && row.outcome.data.domain && row.outcome.data.asn === information?.asn);
    onProviderRecord?.(record?.phase === "done" && record.outcome.ok ? record.outcome.data : null);
  }, [state, information?.asn, onProviderRecord]);
  const primary: SourceRowState = information ? { phase: "done", outcome: { ok: true, data: maxmindSource(information) } }
    : primaryLoading ? { phase: "loading" } : { phase: "done", outcome: { ok: false, code: "UNAVAILABLE" } };
  const rows: GeoRow[] = [["maxmind", primary], ...extraSourceIds.map(id => [id, state[id]] as [SourceId, SourceRowState])];
  return <ComparisonTable rows={rows} echoRows={echoRows} address={address} hidden={hidden} retry={id => controller.retry(id)} />;
}

export function ComparisonTable({ rows = [], echoRows, address, hidden = false, retry }: {
  rows?: GeoRow[]; echoRows?: ComparisonRows; address?: string; hidden?: boolean;
  retry?: (id: Exclude<SourceId, "maxmind">) => void;
}) {
  const t = useTranslations("Sources"), app = useTranslations("App"), { locale } = usePreferences();
  function country(record: SourceRecord) {
    const code = record.country?.code;
    if (code) { try { return new Intl.DisplayNames([locale], { type: "region" }).of(code) || code; } catch { /* English / ISO fallback below. */ } }
    return localizedName(record.country?.names, locale) || code || "—";
  }

  const warning = (record: SourceRecord) => record.updateWarning ? <span title={t("updateWarning")}><TriangleAlert className="inline size-3" aria-hidden /><span className="sr-only">{t("updateWarning")}</span></span> : null;
  const sourceLink = (id: SourceId) => <a href={sourceLinks[id]} title={id === "ipinfo" ? "IPinfo Lite · CC BY-SA 4.0" : id === "ipdata" ? "IP geolocation by ipdata.co" : undefined} target="_blank" rel="noreferrer" className="[overflow-wrap:anywhere]" translate="no">{id === "ipdata" ? "ipdata" : sourceLabels[id]}<ArrowUpRight className="ml-0.5 inline size-2.5 text-muted-foreground" aria-hidden /></a>;
  const feedback = (id: SourceId, row: SourceRowState) => {
    const error = row.phase === "done" && !row.outcome.ok ? row.outcome.code : null;
    return <div className="flex min-h-6 flex-wrap items-center gap-2" role="status">{row.phase === "loading" ? <><span className="sr-only">{app("loading")}</span><Skeleton className="h-4 w-32 max-w-full" /></> : <>
      <span className="text-muted-foreground">{t(error === "NOT_CONFIGURED" ? "notConfigured" : error === "NO_RECORD" ? "noRecord" : error === "RATE_LIMITED" ? "rateLimited" : error === "TIMEOUT" ? "timeout" : "unavailable")}</span>
      {id !== "maxmind" && error !== "NOT_CONFIGURED" && <Button size="sm" variant="ghost" className="min-h-11 sm:min-h-7" aria-label={t("retrySource", { source: sourceLabels[id] })} onClick={() => retry?.(id)}><RefreshCw data-icon="inline-start" aria-hidden />{app("retry")}</Button>}
    </>}</div>;
  };
  function geoRow([id, row]: GeoRow, mobile: boolean) {
    const record = row.phase === "done" && row.outcome.ok ? row.outcome.data : null;
    const asn = record?.asn ? `AS${record.asn}` : "—";
    const date = record && (sourceDateLabel(record) || t("online"));
    return <TableRow key={id} {...(mobile ? { "data-mobile-provider": id } : { "data-provider": id })}
      className="ip-source-row" data-state={record ? "ready" : row.phase === "loading" ? "loading" : "error"}>
      <TableCell>{sourceLink(id)} {mobile && record && warning(record)}</TableCell>
      {record ? <>
        <TableCell colSpan={2}><span className="inline-flex max-w-full flex-wrap items-baseline gap-x-2 gap-y-0.5"><span className="inline-flex items-center gap-1.5"><span className="inline-block leading-none"><RegionFlag code={record.country?.code} size={mobile ? 14 : 18} /></span>{country(record)}</span><span>{localizedName(record.city, locale) || "—"}</span></span>
          {mobile && <span className="sr-only" title={displayTime(record.queriedAt, locale)}><span data-source-asn>{asn}</span> · {t("updated")} {date}</span>}
        </TableCell>
        {!mobile && <><TableCell data-source-asn translate="no">{asn}</TableCell>
          <TableCell className="text-muted-foreground" title={displayTime(record.queriedAt, locale)}>{date} {warning(record)}</TableCell></>}
      </> : <TableCell colSpan={mobile ? 2 : 4}>{feedback(id, row)}</TableCell>}
    </TableRow>;
  }
  function table(mobile: boolean) {
    const columns = mobile ? 3 : 5;
    const labels = [t("source"), t("locationOrIp"), ...(mobile ? [] : [app("asn"), t("updated")])];
    return <Table className="table-fixed report-data [&_th]:h-7 [&_td]:px-1 [&_td]:py-1 [&_td]:whitespace-normal [&_td]:[overflow-wrap:anywhere] [&_tr]:border-border/50" aria-label={t("title")}>
      <colgroup>{(mobile ? ["w-[29%]", "w-[21%]", "w-1/2"] : ["w-[18%]", "w-[18%]", "w-[32%]", "w-[12%]", "w-[20%]"]).map((width, index) => <col key={index} className={width} />)}</colgroup>
      <TableHeader><TableRow data-geo-head>{labels.map((label, index) => <TableHead key={label} scope="col" colSpan={index === 1 ? 2 : 1} className="px-1 report-table-label">{label}</TableHead>)}</TableRow></TableHeader>
      {regions.map(region => {
        const geo = rows.filter(([id]) => sourceRegion[id] === region);
        const echoes = echoRows ? [ipipProvider, ...echoProviders].filter(provider => sourceRegion[provider.id] === region) : [];
        return <TableBody key={region} aria-label={t(region)} data-source-group={region}>
          <TableRow className="hover:bg-transparent"><th colSpan={columns} scope="rowgroup" className="px-1 pt-2 pb-1 text-left report-table-label">{t(region)}</th></TableRow>
          {geo.map(row => geoRow(row, mobile))}
          {echoRows && echoes.map(provider => <EchoTableRow key={provider.id} provider={provider} row={echoRows[provider.id]} address={address} hidden={hidden} valueColumns={columns - 1} />)}
        </TableBody>;
      })}
    </Table>;
  }
  return <section className="min-w-0 border-t border-border/60 pt-5 lg:border-0 lg:pt-0" aria-label={t("title")} data-source-comparison data-source-count={rows.length} data-source-transport="local-and-browser-direct">
    <h2 className="mb-2 report-section-title">{t("title")}</h2>
    <div className="hidden md:block">{table(false)}</div>
    <div className="md:hidden" data-mobile-sources>{table(true)}</div>

  </section>;
}
