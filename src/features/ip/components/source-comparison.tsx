"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { usePreferences } from "@/components/providers/preferences";
import { maxmindSource, type SourceId, type SourceRecord } from "@/lib/contracts/ip-sources";
import type { IpInformation } from "@/lib/contracts/ip";
import { createSourcesController, type SourceRowState } from "../sources";
import { supplementedCity, displayTime } from "../presentation";
import { sourceDateLabel } from "../source-dates";

import { type ComparisonRows, type EchoId } from "../protocol-probe";
import { needsEchoLookup } from "../echo-geography";
import { fetchIp } from "../client";
import { createEchoLocations } from "../echo-locations";
import { EchoTableRow } from "./exit-comparison";
import { ComparisonRow, ComparisonTableFrame } from "./comparison-table";
import { comparisonCatalog, comparisonPlan, homeGeoSourceIds, lookupGeoSourceIds } from "../comparison-catalog";

type GeoRow = [SourceId, SourceRowState];

export function SourceComparison({ address, information, primaryLoading = false, revision = 0, onProviderRecord, echoRows, hidden, onEchoRetry }: {
  echoRows?: ComparisonRows; hidden?: boolean; onEchoRetry?: (id: EchoId) => void;
  address: string; information: IpInformation | null; primaryLoading?: boolean; revision?: number; onProviderRecord?: (record: SourceRecord | null) => void;
}) {
  const ids = echoRows ? homeGeoSourceIds : lookupGeoSourceIds;
  const [controller] = useState(() => createSourcesController(address, undefined, ids));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getServerSnapshot);
  useEffect(() => { controller.refresh(revision > 0); return () => controller.dispose(); }, [controller, revision]);
  useEffect(() => {
    const record = ids.map(id => state[id]).find(row => row.phase === "done" && row.outcome.ok && row.outcome.data.domain && row.outcome.data.asn === information?.asn);
    onProviderRecord?.(record?.phase === "done" && record.outcome.ok ? record.outcome.data : null);
  }, [state, ids, information?.asn, onProviderRecord]);
  const primary: SourceRowState = information ? { phase: "done", outcome: { ok: true, data: maxmindSource(information) } }
    : primaryLoading ? { phase: "loading" } : { phase: "done", outcome: { ok: false, code: "UNAVAILABLE" } };
  const rows: GeoRow[] = [["maxmind", primary], ...ids.map(id => [id, state[id]] as [SourceId, SourceRowState])];
  return <ComparisonTable pendingAddress={primaryLoading ? address : undefined} information={information} rows={rows} echoRows={echoRows} address={address} hidden={hidden} onEchoRetry={onEchoRetry} retry={id => controller.retry(id)} />;
}

export function ComparisonTable({ rows = [], echoRows, address, hidden = false, retry, information, pendingAddress, onEchoRetry }: {
  onEchoRetry?: (id: EchoId) => void; pendingAddress?: string; information?: IpInformation | null; rows?: GeoRow[]; echoRows?: ComparisonRows; address?: string; hidden?: boolean;
  retry?: (id: Exclude<SourceId, "maxmind">) => void;
}) {
  const t = useTranslations("Sources"), { locale } = usePreferences();
  const [locations] = useState(() => createEchoLocations(fetchIp));
  const locationState = useSyncExternalStore(locations.subscribe, locations.getSnapshot, locations.getSnapshot);
  const addresses = [...new Set(comparisonCatalog.flatMap(source => { const row = source.echo ? echoRows?.[source.echo] : undefined; return row?.phase === "done" && row.outcome.ok && needsEchoLookup(row.outcome.data.location) ? [row.outcome.data.address] : []; }))].sort().join(",");
  useEffect(() => { locations.sync(addresses ? addresses.split(",") : [], information, pendingAddress); }, [locations, addresses, information, pendingAddress]);
  useEffect(() => () => locations.dispose(), [locations]);


  function geoRow([id, row]: GeoRow, mobile: boolean) {
    const source = comparisonCatalog.find(item => item.query === id)!;
    const record = row.phase === "done" && row.outcome.ok ? row.outcome.data : null;
    const country = record?.country ?? information?.geolocatedCountry;
    const city = supplementedCity(record?.city, record?.country, information);
    const asn = record?.asn ?? information?.asn;
    const localFallback = record && ((!record.country && country) || (!record.city && city) || (!record.asn && asn));
    const error = row.phase === "done" && !row.outcome.ok ? row.outcome.code : null;
    return <ComparisonRow key={source.id} source={source} mobile={mobile}
      state={record ? "ready" : row.phase === "loading" ? "loading" : "error"}
      location={record ? { country, city } : undefined} asn={record ? asn : null}
      date={record ? sourceDateLabel(record) || t("online") : undefined}
      dateTitle={record ? displayTime(record.queriedAt, locale) : undefined}
      details={localFallback ? t("localEchoLocation") : undefined} updateWarning={!!record?.updateWarning}
      feedback={t(error === "NOT_CONFIGURED" ? "notConfigured" : error === "NO_RECORD" ? "noRecord" : error === "RATE_LIMITED" ? "rateLimited" : error === "TIMEOUT" ? "timeout" : "unavailable")}
      retry={!record && row.phase === "done" && id !== "maxmind" && error !== "NOT_CONFIGURED" && retry ? () => retry(id) : undefined} />;
  }
  function table(mobile: boolean) {
    const entries = comparisonPlan(echoRows ? "home" : "lookup").map(source => {
      if (source.kind === "echo" && echoRows && source.echo) return <EchoTableRow key={source.id} source={source} row={echoRows[source.echo]} address={address} hidden={hidden} locations={locationState} onRetry={locations.retry} onEchoRetry={onEchoRetry} mobile={mobile} />;
      if (source.kind === "query" && source.query) {
        const row = rows.find(item => item[0] === source.query);
        if (row) return geoRow(row, mobile);
      }
      return <ComparisonRow key={source.id} source={source} mobile={mobile}
        state="waiting" feedback={t("awaitingAddress")} />;
    });
    return <ComparisonTableFrame mobile={mobile}>{entries}</ComparisonTableFrame>;
  }
  return <section className="report-comparison" aria-label={t("title")} data-source-comparison data-source-count={comparisonCatalog.length} data-comparison-count={comparisonCatalog.length} data-comparison-order={comparisonCatalog.map(source => source.id).join(",")} data-comparison-mode={echoRows ? "home" : "lookup"} data-source-transport="local-and-browser-direct">
    <h2 className="report-section-title">{t("title")}</h2>
    <div className="hidden md:block">{table(false)}</div>
    <div className="md:hidden" data-mobile-sources>{table(true)}</div>

  </section>;
}
