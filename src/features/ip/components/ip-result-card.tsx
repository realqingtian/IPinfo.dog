"use client";
import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import FadeContent from "@/components/react-bits/FadeContent";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { usePreferences } from "@/components/providers/preferences";
import { CopyButton } from "./copy-button";
import { SourceComparison } from "./source-comparison";
import { IpReportHeader } from "./ip-report-header";
import type { ComparisonRows } from "../protocol-probe";
import { ProviderIcon } from "./provider-icon";
import { providerDomainForResult } from "@/lib/provider-domain";
import type { SourceRecord } from "@/lib/contracts/ip-sources";
import { localizedName, maskIpAddress } from "../presentation";
import { queryPath } from "../query";
import type { GeoCountry, IpInformation } from "@/lib/contracts/ip";

export function IpResultToolbar({ result, hidden = false, onHiddenChange, onRefresh, status = "ready", title, children, protocolControl, reserveActions = false }: {
  result: Pick<IpInformation, "address" | "family"> | null; hidden?: boolean; onHiddenChange?: (hidden: boolean) => void;
  onRefresh?: () => void; status?: "ready" | "loading" | "unavailable"; title: ReactNode; children?: ReactNode; protocolControl?: ReactNode; reserveActions?: boolean;
}) {
  const t = useTranslations("App"), protocol = result?.family === "ipv4" ? "IPv4" : "IPv6";
  return <div className="flex min-h-11 min-w-0 flex-wrap items-center justify-between gap-2 sm:min-h-8" data-ip-toolbar>
    <div className="order-2 flex min-w-0 flex-1 flex-wrap items-center gap-2 text-xs text-muted-foreground sm:order-1 sm:flex-initial">{title}{protocolControl ?? (result && <Badge variant="secondary">{protocol}</Badge>)}{result && <span className="sr-only" role="status">{status === "ready" ? t("recordFor", { protocol }) : t(status === "loading" ? "loading" : "unavailable")}</span>}{result && status === "unavailable" && <span aria-hidden className="hidden sm:inline-flex">{t("unavailable")}</span>}</div>
    {children && <div className="order-1 w-full sm:order-2 sm:ml-auto sm:w-auto sm:min-w-64 sm:max-w-md sm:flex-1">{children}</div>}
    {(result || reserveActions) && <div className="order-3 flex shrink-0 items-center">{result ? <>
      <CopyButton key={`address:${result.address}`} value={result.address} label={t("copyAddress", { protocol })} />
      <Button variant="ghost" size="icon" className="min-h-11 min-w-11 sm:min-h-8 sm:min-w-8" aria-label={t(hidden ? "show" : "hide", { protocol })} title={t(hidden ? "show" : "hide", { protocol })} onClick={() => onHiddenChange?.(!hidden)}>{hidden ? <Eye aria-hidden /> : <EyeOff aria-hidden />}</Button>
      {onRefresh && <Button variant="ghost" size="icon" className="min-h-11 min-w-11 sm:min-h-8 sm:min-w-8" disabled={status === "loading"} aria-label={t("refreshRecord", { protocol })} title={t("refreshRecord", { protocol })} onClick={onRefresh}>{status === "loading" ? <Spinner aria-hidden aria-label={undefined} /> : <RefreshCw aria-hidden />}</Button>}
      <CopyButton key={`link:${result.address}`} icon="link" value={() => new URL(queryPath(result.address), location.origin).href} label={t("copyLink")} />
    </> : <span aria-hidden className="h-11 w-44 sm:h-8 sm:w-32" data-pending-actions />}
    </div>}
  </div>;
}

export function IpResultCard({ result, status = "ready", onRefresh, hidden: controlledHidden, onHiddenChange, sourceRevision = 0, title, showToolbar = true, echoRows }: {
  result: IpInformation | Pick<IpInformation, "address" | "family">; status?: "ready" | "loading" | "unavailable"; onRefresh?: () => void;
  hidden?: boolean; onHiddenChange?: (hidden: boolean) => void; sourceRevision?: number; title?: string; showToolbar?: boolean; echoRows?: ComparisonRows;
}) {
  const t = useTranslations("App"), { locale } = usePreferences();
  const [ownHidden, setOwnHidden] = useState(false), hidden = controlledHidden ?? ownHidden, setHidden = onHiddenChange ?? setOwnHidden;
  const [providerRecord, setProviderRecord] = useState<SourceRecord | null>(null);
  const displayAddress = hidden ? maskIpAddress(result.address) : result.address;
  const providerDomain = providerDomainForResult(result, providerRecord);
  const protocol = result.family === "ipv4" ? "IPv4" : "IPv6", information = "datasetId" in result ? result : null;
  const countryName = (value: GeoCountry | null | undefined) => localizedName(value?.names, locale) || value?.code || t("unknown");
  const city = localizedName(information?.city, locale);
  const rows = [
    [t("asn"), information?.asn ? `AS${information.asn}` : "—"],
    [t("organization"), information?.organization || "—"],
    [t("region"), countryName(information?.geolocatedCountry)],
    [t("city"), city || "—"],
    [t("registeredCountry"), countryName(information?.registeredCountry)],
    ...(information?.subdivisions.length ? [[t("subdivisions"), information.subdivisions.map(value => localizedName(value, locale) || "—").join(" / ")]] : []),
    ...(information?.accuracyRadiusKm !== null && information?.accuracyRadiusKm !== undefined ? [[t("accuracyRadius"), `${information.accuracyRadiusKm} km`]] : []),
  ];
  const summary = information ? [countryName(information.geolocatedCountry), city, information.asn ? `AS${information.asn}` : null].filter(Boolean) : [];
  return <section className="flex min-w-0 flex-col gap-2" aria-label={t("recordFor", { protocol })} data-result-report data-result-status={status}>
    {showToolbar && <IpResultToolbar result={result} status={status} title={title || t("queryResult")} hidden={hidden} onHiddenChange={setHidden} onRefresh={onRefresh} />}
    <FadeContent trigger="mount" duration={0.18} initialOpacity={0.75} blur={false} className="min-w-0" data-ip-reveal>
    <Card className="min-w-0 rounded-xl [--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(5)]">
      <IpReportHeader address={result.address} hidden={hidden} countryCode={information?.geolocatedCountry?.code}
        addressLabel={hidden ? `${t("hidden", { segments: result.family === "ipv6" ? 4 : 2 })}: ${displayAddress}` : undefined}
        summary={status === "loading" ? <Skeleton className="h-5 w-56 max-w-full" /> : summary.length || information?.organization ? <>{summary.join(" · ")}{information?.organization && <><span aria-hidden> · </span><span className="inline-flex max-w-full items-center gap-1.5 align-bottom" translate="no"><ProviderIcon domain={providerDomain} /><span className="min-w-0 break-words">{information.organization}</span></span></>}</> : t("queryUnavailable")} />
      <CardContent className="min-w-0"><div className="grid min-w-0 gap-4 border-t border-border/60 pt-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.7fr)] lg:gap-5">
        <section className="min-w-0 lg:border-r lg:border-border/60 lg:pr-5" aria-label={t("networkInformation")}>
          <h2 className="mb-2 report-section-title">{t("networkInformation")}</h2>
          <dl className="flex min-w-0 flex-col report-data" aria-busy={status === "loading"}>
            {rows.map(([label, value]) => <div className="grid min-w-0 grid-cols-[6rem_minmax(0,1fr)] items-start gap-3 border-b border-border/50 py-1.5 last:border-0" key={label}><dt className="text-muted-foreground">{label}</dt><dd className="min-w-0 break-words text-right">{status === "loading" ? <Skeleton className="ml-auto h-5 w-24" /> : status === "unavailable" ? "—" : value}</dd></div>)}
          </dl>
          {information && information.conflicts.length > 0 && <Alert><AlertTitle>{t("sourceConflict")}</AlertTitle><AlertDescription>{t("sourceConflictHint")}</AlertDescription></Alert>}
        </section>
        <div className="min-w-0"><SourceComparison key={result.address} address={result.address} information={information} primaryLoading={status === "loading"} revision={sourceRevision} echoRows={echoRows} hidden={hidden} onProviderRecord={setProviderRecord} />
        </div>
      </div></CardContent>
    </Card>
    </FadeContent>
  </section>;
}
