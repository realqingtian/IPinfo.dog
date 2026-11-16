"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight, ChevronDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { RegionFlag } from "@/components/region-flag";
import { usePreferences } from "@/components/providers/preferences";
import { extraSourceIds, maxmindSource, sourceLabels, sourceLinks, type SourceId, type SourceRecord } from "@/lib/contracts/ip-sources";
import type { IpInformation } from "@/lib/contracts/ip";
import { createSourcesController, type SourceRowState } from "../sources";
import { localizedName, displayTime } from "../presentation";
import { sourceDateLabel } from "../source-dates";

export function SourceComparison({ address, information, primaryLoading = false, revision = 0 }: {
  address: string; information: IpInformation | null; primaryLoading?: boolean; revision?: number;
}) {
  const t = useTranslations("Sources"), app = useTranslations("App"), { locale } = usePreferences();
  const [controller] = useState(() => createSourcesController(address));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getServerSnapshot);
  useEffect(() => { controller.refresh(); return () => controller.dispose(); }, [controller, revision]);
  const primary: SourceRowState = information ? { phase: "done", outcome: { ok: true, data: maxmindSource(information) } }
    : primaryLoading ? { phase: "loading" } : { phase: "done", outcome: { ok: false, code: "UNAVAILABLE" } };
  const rows: [SourceId, SourceRowState][] = [["maxmind", primary], ...extraSourceIds.map(id => [id, state[id]] as [SourceId, SourceRowState])];
  function country(record: SourceRecord) {
    const code = record.country?.code;
    if (code) { try { return new Intl.DisplayNames([locale], { type: "region" }).of(code) || code; } catch { /* English / ISO fallback below. */ } }
    return localizedName(record.country?.names, locale) || code || "—";
  }
  return <section className="min-w-0 border-t pt-5 lg:border-0 lg:pt-0" aria-label={t("title")} data-source-comparison>
    <h2 className="mb-3 text-xs font-medium text-muted-foreground">{t("title")}</h2>
    <div>
      <Table className="min-w-[600px]" aria-label={t("title")}>
        <TableHeader><TableRow>
          {[t("source"), t("region"), app("city"), app("asn"), t("updated")].map(label => <TableHead scope="col" key={label}>{label}</TableHead>)}
        </TableRow></TableHeader>
        <TableBody>{rows.map(([id, row]) => {
          const record = row.phase === "done" && row.outcome.ok ? row.outcome.data : null;
          const error = row.phase === "done" && !row.outcome.ok ? row.outcome.code : null;
          return <TableRow key={id} data-provider={id}>
            <TableCell><a href={sourceLinks[id]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1" translate="no">{sourceLabels[id]}<ArrowUpRight className="size-3 text-muted-foreground" aria-hidden /></a></TableCell>
            {record ? <>
              <TableCell><span className="inline-flex items-center gap-2"><RegionFlag code={record.country?.code} />{country(record)}</span></TableCell>
              <TableCell>{localizedName(record.city, locale) || "—"}</TableCell>
              <TableCell translate="no">{record.asn ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground" title={displayTime(record.queriedAt, locale)}>{sourceDateLabel(record) || t("online")}</TableCell>
            </> : <TableCell colSpan={4}>
              <div className="flex min-h-6 items-center gap-2" role="status">{row.phase === "loading" ? <><span className="sr-only">{app("loading")}</span><Skeleton className="h-4 w-32" /></> : <>
                <span className="text-muted-foreground">{t(error === "NOT_CONFIGURED" ? "notConfigured" : error === "NO_RECORD" ? "noRecord" : error === "RATE_LIMITED" ? "rateLimited" : error === "TIMEOUT" ? "timeout" : "unavailable")}</span>
                {id !== "maxmind" && error !== "NOT_CONFIGURED" && <Button size="sm" variant="ghost" className="min-h-11 sm:min-h-7" aria-label={t("retrySource", { source: sourceLabels[id] })} onClick={() => controller.retry(id)}><RefreshCw data-icon="inline-start" aria-hidden />{app("retry")}</Button>}
              </>}</div>
            </TableCell>}
          </TableRow>;
        })}</TableBody>
      </Table>
      <p className="mt-2 text-xs text-muted-foreground md:hidden">{t("scrollHint")}</p>
    </div>
    <Collapsible className="mt-3 w-full"><CollapsibleTrigger asChild><Button variant="ghost" size="sm">{t("about")}<ChevronDown data-icon="inline-end" aria-hidden /></Button></CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-3 pt-2 text-xs leading-5 text-muted-foreground">
        <p>{t("aboutText")}</p><p>{t("privacy")}</p>
        {rows.map(([id, row]) => row.phase === "done" && row.outcome.ok ? <div key={id} className="flex flex-col gap-1">
          <h3 className="font-medium" translate="no">{sourceLabels[id]}</h3>
          {id === "maxmind" && information && <p className="break-all">{app("version")}：{information.datasetId}</p>}
          {id === "maxmind" && information && Object.entries(information.fieldSources).map(([field, source]) => <p key={field}>{app("fieldSource", { field: app(({ geolocatedCountry: "region", registeredCountry: "registeredCountry", subdivisions: "subdivisions", city: "city", accuracyRadiusKm: "accuracyRadius", asn: "asn", organization: "organization" } as const)[field as keyof typeof information.fieldSources]) })}：{source || app("unknown")}</p>)}
          <p>{app("organization")}：{row.outcome.data.organization || app("unknown")}</p>
          {row.outcome.data.domain && <p translate="no">{row.outcome.data.domain}</p>}
          {row.outcome.data.dataDates.map(date => <p key={date.kind}>{t("dataDate", { kind: t(date.kind), date: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(date.date)) })}</p>)}
          <p>{t("queried", { time: displayTime(row.outcome.data.queriedAt, locale) })}</p>
        </div> : null)}
        <p>{t("licenses")} <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer" className="underline">DB-IP · CC BY 4.0</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer" className="underline">IPinfo · CC BY-SA 4.0</a></p>
      </CollapsibleContent>
    </Collapsible>
  </section>;
}

export function SourceAttribution() {
  const t = useTranslations("Sources");
  return <p className="text-xs leading-5 text-muted-foreground">{t("locationNotice")}</p>;
}
