"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { RegionFlag } from "@/components/region-flag";
import { usePreferences } from "@/components/providers/preferences";
import { extraSourceIds, maxmindSource, sourceLabels, sourceLinks, type SourceId, type SourceRecord } from "@/lib/contracts/ip-sources";
import type { IpInformation } from "@/lib/contracts/ip";
import { createSourcesController, type SourceRowState } from "../sources";
import { localizedName, displayTime } from "../presentation";
import { sourceDateLabel } from "../source-dates";

export function SourceComparison({ address, information, primaryLoading = false, revision = 0, onProviderRecord }: {
  address: string; information: IpInformation | null; primaryLoading?: boolean; revision?: number; onProviderRecord?: (record: SourceRecord | null) => void;
}) {
  const t = useTranslations("Sources"), app = useTranslations("App"), { locale } = usePreferences();
  const [controller] = useState(() => createSourcesController(address));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getServerSnapshot);
  useEffect(() => { controller.refresh(revision > 0); return () => controller.dispose(); }, [controller, revision]);
  useEffect(() => {
    const record = extraSourceIds.map(id => state[id]).find(row => row.phase === "done" && row.outcome.ok && row.outcome.data.domain && row.outcome.data.asn === information?.asn);
    onProviderRecord?.(record?.phase === "done" && record.outcome.ok ? record.outcome.data : null);
  }, [state, information?.asn, onProviderRecord]);
  const primary: SourceRowState = information ? { phase: "done", outcome: { ok: true, data: maxmindSource(information) } }
    : primaryLoading ? { phase: "loading" } : { phase: "done", outcome: { ok: false, code: "UNAVAILABLE" } };
  const rows: [SourceId, SourceRowState][] = [["maxmind", primary], ...extraSourceIds.map(id => [id, state[id]] as [SourceId, SourceRowState])];
  function country(record: SourceRecord) {
    const code = record.country?.code;
    if (code) { try { return new Intl.DisplayNames([locale], { type: "region" }).of(code) || code; } catch { /* English / ISO fallback below. */ } }
    return localizedName(record.country?.names, locale) || code || "—";
  }


  const warning = (record: SourceRecord) => record.updateWarning ? <span title={t("updateWarning")}><TriangleAlert className="inline size-3" aria-hidden /><span className="sr-only">{t("updateWarning")}</span></span> : null;
  const sourceLink = (id: SourceId) => <a href={sourceLinks[id]} title={id === "ipinfo" ? "IPinfo Lite · CC BY-SA 4.0" : undefined} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1" translate="no">{sourceLabels[id]}<ArrowUpRight className="size-3 text-muted-foreground" aria-hidden /></a>;
  const feedback = (id: SourceId, row: SourceRowState) => {
    const error = row.phase === "done" && !row.outcome.ok ? row.outcome.code : null;
    return <div className="flex min-h-6 items-center gap-2" role="status">{row.phase === "loading" ? <><span className="sr-only">{app("loading")}</span><Skeleton className="h-4 w-32 max-w-full" /></> : <>
      <span className="text-muted-foreground">{t(error === "NOT_CONFIGURED" ? "notConfigured" : error === "NO_RECORD" ? "noRecord" : error === "RATE_LIMITED" ? "rateLimited" : error === "TIMEOUT" ? "timeout" : "unavailable")}</span>
      {id !== "maxmind" && error !== "NOT_CONFIGURED" && <Button size="sm" variant="ghost" className="min-h-11 sm:min-h-7" aria-label={t("retrySource", { source: sourceLabels[id] })} onClick={() => controller.retry(id)}><RefreshCw data-icon="inline-start" aria-hidden />{app("retry")}</Button>}
    </>}</div>;
  };
  return <section className="min-w-0 border-t border-border/60 pt-5 lg:border-0 lg:pt-0" aria-label={t("title")} data-source-comparison data-source-count={rows.length} data-source-transport="local-and-browser-direct">
    <h2 className="mb-2 report-section-title">{t("title")}</h2>
    <div className="hidden md:block">
      <Table className="table-fixed report-data [&_th]:h-7 [&_td]:px-1.5 [&_td]:py-1.5 [&_tr]:border-border/50" aria-label={t("title")}>
        <colgroup><col className="w-[18%]" /><col className="w-[18%]" /><col className="w-[32%]" /><col className="w-[12%]" /><col className="w-[20%]" /></colgroup>
        <TableHeader><TableRow>
          {[t("source"), t("region"), app("city"), app("asn"), t("updated")].map(label => <TableHead scope="col" key={label} className="report-table-label">{label}</TableHead>)}
        </TableRow></TableHeader>
        <TableBody>{rows.map(([id, row]) => {
          const record = row.phase === "done" && row.outcome.ok ? row.outcome.data : null;
          return <TableRow key={id} data-provider={id} className="ip-source-row" data-state={record ? "ready" : row.phase === "loading" ? "loading" : "error"}>
            <TableCell className="whitespace-normal"><span className="inline-flex max-w-full flex-wrap items-center gap-x-1">{sourceLink(id)}</span></TableCell>
            {record ? <>
              <TableCell className="whitespace-normal"><span className="inline-flex max-w-full items-center gap-2"><RegionFlag code={record.country?.code} /><span className="min-w-0 [overflow-wrap:anywhere]">{country(record)}</span></span></TableCell>
              <TableCell className="whitespace-normal [overflow-wrap:anywhere]">{localizedName(record.city, locale) || "—"}</TableCell>
              <TableCell data-source-asn translate="no" className="whitespace-normal [overflow-wrap:anywhere]">{record.asn ? `AS${record.asn}` : "—"}</TableCell>
              <TableCell className="text-muted-foreground" title={displayTime(record.queriedAt, locale)}>{sourceDateLabel(record) || t("online")} {warning(record)}</TableCell>
            </> : <TableCell colSpan={4}>{feedback(id, row)}</TableCell>}
          </TableRow>;
        })}</TableBody>
      </Table>

    </div>
    <div className="md:hidden" data-mobile-sources>{rows.map(([id, row]) => {
      const record = row.phase === "done" && row.outcome.ok ? row.outcome.data : null;
      return <div key={id} data-mobile-provider={id} className="min-w-0 border-b border-border/50 py-2 report-data first:pt-0 last:border-0 last:pb-0">
        <div className="flex min-w-0 items-start justify-between gap-3"><span className="font-medium">{sourceLink(id)}</span>{record && <span className="inline-flex min-w-0 items-center gap-1.5 text-right"><RegionFlag code={record.country?.code} /><span className="min-w-0 break-words">{country(record)}</span></span>}</div>
        {record ? <>
          <div className="mt-1 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3"><span className="min-w-0 break-words text-muted-foreground">{localizedName(record.city, locale) || "—"}</span><span data-source-asn className="font-mono report-meta" translate="no">{record.asn ? `AS${record.asn}` : "—"}</span></div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 report-meta"><span title={displayTime(record.queriedAt, locale)}>{t("updated")}: {sourceDateLabel(record) || t("online")} {warning(record)}</span></div>
        </> : <div className="mt-1">{feedback(id, row)}</div>}
      </div>;
    })}</div>
  </section>;
}
