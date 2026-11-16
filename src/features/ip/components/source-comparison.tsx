"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { RegionFlag } from "@/components/region-flag";
import { usePreferences } from "@/components/providers/preferences";
import { extraSourceIds, maxmindSource, sourceLabels, sourceLinks, type SourceId, type SourceRecord } from "@/lib/contracts/ip-sources";
import type { IpInformation } from "@/lib/contracts/ip";
import { createSourcesController, type SourceRowState } from "../sources";
import { localizedCountry, supplementedCity, localizedName, displayTime } from "../presentation";
import { sourceDateLabel } from "../source-dates";

import { echoProviders, ipipProvider, ip138Provider, type ComparisonRows, type EchoId } from "../protocol-probe";
import { needsEchoLookup } from "../echo-geography";
import { fetchIp } from "../client";
import { createEchoLocations } from "../echo-locations";
import { EchoTableRow } from "./exit-comparison";
import { SourceLink } from "./source-link";

type GeoRow = [SourceId, SourceRowState];
const leadingSources = new Map<string, number>(["ip138", "ipip", "ddnspod", "mir6"].map((id, index) => [id, index]));

export function SourceComparison({ address, information, primaryLoading = false, revision = 0, onProviderRecord, echoRows, hidden, onEchoRetry }: {
  echoRows?: ComparisonRows; hidden?: boolean; onEchoRetry?: (id: EchoId) => void;
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
  return <ComparisonTable pendingAddress={primaryLoading ? address : undefined} information={information} rows={rows} echoRows={echoRows} address={address} hidden={hidden} onEchoRetry={onEchoRetry} retry={id => controller.retry(id)} />;
}

export function ComparisonTable({ rows = [], echoRows, address, hidden = false, retry, information, pendingAddress, onEchoRetry }: {
  onEchoRetry?: (id: EchoId) => void; pendingAddress?: string; information?: IpInformation | null; rows?: GeoRow[]; echoRows?: ComparisonRows; address?: string; hidden?: boolean;
  retry?: (id: Exclude<SourceId, "maxmind">) => void;
}) {
  const t = useTranslations("Sources"), app = useTranslations("App"), { locale } = usePreferences();
  const [locations] = useState(() => createEchoLocations(fetchIp));
  const locationState = useSyncExternalStore(locations.subscribe, locations.getSnapshot, locations.getSnapshot);
  const addresses = [...new Set([ip138Provider, ipipProvider, ...echoProviders].flatMap(provider => { const row = echoRows?.[provider.id]; return row?.phase === "done" && row.outcome.ok && needsEchoLookup(row.outcome.data.location) ? [row.outcome.data.address] : []; }))].sort().join(",");
  useEffect(() => { locations.sync(addresses ? addresses.split(",") : [], information, pendingAddress); }, [locations, addresses, information, pendingAddress]);
  useEffect(() => () => locations.dispose(), [locations]);


  const warning = (record: SourceRecord) => record.updateWarning ? <span title={t("updateWarning")}><TriangleAlert className="inline size-3" aria-hidden /><span className="sr-only">{t("updateWarning")}</span></span> : null;
  const sourceLink = (id: SourceId) => <SourceLink href={sourceLinks[id]} label={id === "ipdata" ? "ipdata" : sourceLabels[id]}
    title={id === "ipinfo" ? "IPinfo Lite · CC BY-SA 4.0" : id === "ipdata" ? "IP geolocation by ipdata.co" : undefined} />;
  const feedback = (id: SourceId, row: SourceRowState) => {
    const error = row.phase === "done" && !row.outcome.ok ? row.outcome.code : null;
    return <div className="flex min-h-6 flex-wrap items-center gap-2" role="status">{row.phase === "loading" ? <><span className="sr-only">{app("loading")}</span><Skeleton className="h-4 w-32 max-w-full" /></> : <>
      <span className="text-muted-foreground">{t(error === "NOT_CONFIGURED" ? "notConfigured" : error === "NO_RECORD" ? "noRecord" : error === "RATE_LIMITED" ? "rateLimited" : error === "TIMEOUT" ? "timeout" : "unavailable")}</span>
      {id !== "maxmind" && error !== "NOT_CONFIGURED" && <Button size="sm" variant="ghost" className="min-h-11 sm:min-h-7" aria-label={t("retrySource", { source: sourceLabels[id] })} onClick={() => retry?.(id)}><RefreshCw data-icon="inline-start" aria-hidden />{app("retry")}</Button>}
    </>}</div>;
  };
  function geoRow([id, row]: GeoRow, mobile: boolean) {
    const record = row.phase === "done" && row.outcome.ok ? row.outcome.data : null;
    const country = record?.country ?? information?.geolocatedCountry;
    const city = supplementedCity(record?.city, record?.country, information);
    const asnValue = record?.asn ?? information?.asn;
    const localFallback = record && ((!record.country && country) || (!record.city && city) || (!record.asn && asnValue));
    const asn = asnValue ? `AS${asnValue}` : "—";
    const date = record && (sourceDateLabel(record) || t("online"));
    return <TableRow key={id} {...(mobile ? { "data-mobile-provider": id } : { "data-provider": id })}
      className="ip-source-row" title={localFallback ? t("localEchoLocation") : undefined} data-state={record ? "ready" : row.phase === "loading" ? "loading" : "error"}>
      <TableCell>{sourceLink(id)} {mobile && record && warning(record)}</TableCell>
      {record ? <>
        <TableCell colSpan={2}><span className="inline-flex max-w-full flex-wrap items-baseline gap-x-2 gap-y-0.5"><span className="inline-flex items-center gap-1.5"><span className="inline-block leading-none"><RegionFlag code={country?.code} size={mobile ? 14 : 18} /></span>{localizedCountry(country, locale)}</span><span>{localizedName(city, locale) || "—"}</span></span>
          {mobile && <span className="sr-only" title={displayTime(record.queriedAt, locale)}><span data-source-asn>{asn}</span> · {t("updated")} {date}</span>}
        </TableCell>
        {!mobile && <><TableCell data-source-asn translate="no">{asn}</TableCell>
          <TableCell className="text-muted-foreground" title={displayTime(record.queriedAt, locale)}>{date} {warning(record)}</TableCell></>}
      </> : <TableCell colSpan={mobile ? 2 : 4}>{feedback(id, row)}</TableCell>}
    </TableRow>;
  }
  function table(mobile: boolean) {
    const labels = [t("source"), t("countryCity"), ...(mobile ? [] : [app("asn"), t("updated")])];
    const entries = [
      ...rows.map(row => ({ id: row[0], element: geoRow(row, mobile) })),
      ...(echoRows ? [ip138Provider, ipipProvider, ...echoProviders].map(provider => ({ id: provider.id,
        element: <EchoTableRow key={provider.id} provider={provider} row={echoRows[provider.id]} address={address} hidden={hidden} locations={locationState} onRetry={locations.retry} onEchoRetry={onEchoRetry} mobile={mobile} /> })) : []),
    ].sort((a, b) => (leadingSources.get(a.id) ?? leadingSources.size) - (leadingSources.get(b.id) ?? leadingSources.size));
    return <Table className="table-fixed report-data [&_th]:h-7 [&_td]:px-1 [&_td]:py-1 [&_td]:whitespace-normal [&_td]:[overflow-wrap:anywhere] [&_tr]:border-border/50" aria-label={t("title")}>
      <colgroup>{(mobile ? ["w-[34%]", "w-[16%]", "w-1/2"] : ["w-[18%]", "w-[18%]", "w-[32%]", "w-[12%]", "w-[20%]"]).map((width, index) => <col key={index} className={width} />)}</colgroup>
      <TableHeader><TableRow data-geo-head>{labels.map((label, index) => <TableHead key={label} scope="col" colSpan={index === 1 ? 2 : 1} className="px-1 report-table-label">{label}</TableHead>)}</TableRow></TableHeader>
      <TableBody>
        {entries.map(entry => entry.element)}
      </TableBody>
    </Table>;
  }
  return <section className="min-w-0 border-t border-border/60 pt-5 lg:border-0 lg:pt-0" aria-label={t("title")} data-source-comparison data-source-count={rows.length} data-source-transport="local-and-browser-direct">
    <h2 className="mb-2 report-section-title">{t("title")}</h2>
    <div className="hidden md:block">{table(false)}</div>
    <div className="md:hidden" data-mobile-sources>{table(true)}</div>

  </section>;
}
