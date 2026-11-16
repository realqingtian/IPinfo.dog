"use client";
import { Fragment, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { usePreferences } from "@/components/providers/preferences";
import { RegionFlag } from "@/components/region-flag";
import { CopyButton } from "./copy-button";
import { SourceComparison, SourceAttribution } from "./source-comparison";
import { ipDisplayParts, localizedName } from "../presentation";
import { queryPath } from "../query";
import type { GeoCountry, IpInformation } from "@/lib/contracts/ip";

export function IpResultToolbar({ result, hidden = false, onHiddenChange, onRefresh, status = "ready", title, children }: {
  result: Pick<IpInformation, "address" | "family"> | null; hidden?: boolean; onHiddenChange?: (hidden: boolean) => void;
  onRefresh?: () => void; status?: "ready" | "loading" | "unavailable"; title: ReactNode; children?: ReactNode;
}) {
  const t = useTranslations("App"), protocol = result?.family === "ipv4" ? "IPv4" : "IPv6";
  return <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
    <div className="order-2 flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground sm:order-1">{title}{result && <Badge variant="secondary">{protocol}</Badge>}{result && <span className="sr-only" role="status">{status === "ready" ? t("recordFor", { protocol }) : t(status === "loading" ? "loading" : "unavailable")}</span>}{result && status !== "ready" && <span aria-hidden>{t(status === "loading" ? "loading" : "unavailable")}</span>}</div>
    {children && <div className="order-1 w-full sm:order-2 sm:ml-auto sm:w-auto sm:min-w-64 sm:max-w-md sm:flex-1">{children}</div>}
    {result && <div className="order-3 flex shrink-0 items-center">
      <CopyButton key={`address:${result.address}`} value={result.address} label={t("copyAddress", { protocol })} />
      <Button variant="ghost" size="icon" className="min-h-11 min-w-11 sm:min-h-8 sm:min-w-8" aria-label={t(hidden ? "show" : "hide", { protocol })} title={t(hidden ? "show" : "hide", { protocol })} onClick={() => onHiddenChange?.(!hidden)}>{hidden ? <Eye aria-hidden /> : <EyeOff aria-hidden />}</Button>
      {onRefresh && <Button variant="ghost" size="icon" className="min-h-11 min-w-11 sm:min-h-8 sm:min-w-8" disabled={status === "loading"} aria-label={t("refreshRecord", { protocol })} title={t("refreshRecord", { protocol })} onClick={onRefresh}><RefreshCw aria-hidden /></Button>}
      <CopyButton key={`link:${result.address}`} icon="link" value={() => new URL(queryPath(result.address), location.origin).href} label={t("copyLink")} />
    </div>}
  </div>;
}

export function IpResultCard({ result, status = "ready", onRefresh, hidden: controlledHidden, onHiddenChange, sourceRevision = 0, title, showToolbar = true }: {
  result: IpInformation | Pick<IpInformation, "address" | "family">; status?: "ready" | "loading" | "unavailable"; onRefresh?: () => void;
  hidden?: boolean; onHiddenChange?: (hidden: boolean) => void; sourceRevision?: number; title?: string; showToolbar?: boolean;
}) {
  const t = useTranslations("App"), { locale } = usePreferences();
  const [ownHidden, setOwnHidden] = useState(false), hidden = controlledHidden ?? ownHidden, setHidden = onHiddenChange ?? setOwnHidden;
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
  const summary = information ? [countryName(information.geolocatedCountry), city, information.asn ? `AS${information.asn}` : null, information.organization].filter(Boolean) : [];
  return <section className="flex min-w-0 flex-col gap-2" aria-label={t("recordFor", { protocol })} data-result-report>
    {showToolbar && <IpResultToolbar result={result} status={status} title={title || t("queryResult")} hidden={hidden} onHiddenChange={setHidden} onRefresh={onRefresh} />}
    <Card className="min-w-0 rounded-2xl [--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(6)]">
      <CardHeader className="gap-5 has-data-[slot=card-description]:grid-rows-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
        <div className="min-w-0">
        <CardTitle className="flex min-w-0 items-start gap-3"><span className="mt-1 inline-flex"><RegionFlag code={information?.geolocatedCountry?.code} size={24} /></span><span translate="no" className="min-w-0 font-mono text-2xl leading-tight font-bold tracking-tight [overflow-wrap:anywhere] sm:text-[30px]" aria-label={hidden ? t("hidden") : undefined}>{hidden ? "••••••••" : ipDisplayParts(result.address).map((part, index) => <Fragment key={index}>{index > 0 && <wbr />}{part}</Fragment>)}</span></CardTitle>
        <CardDescription className="mt-1 min-w-0 break-words leading-5">{status === "loading" ? <Skeleton className="h-5 w-56 max-w-full" /> : summary.length ? summary.join(" · ") : t("queryUnavailable")}</CardDescription>
        </div>
        <div className="hidden min-w-0 grid-cols-2 gap-2 lg:grid" data-report-summary>
          {[
            [t("region"), countryName(information?.geolocatedCountry), city],
            [t("asn"), information?.asn ? `AS${information.asn}` : "—", information?.organization],
          ].map(([label, value, detail]) => <Card key={label} size="sm" className="min-w-0 bg-muted/60 ring-0">
            <CardHeader><CardDescription>{label}</CardDescription><CardTitle>{status === "loading" ? <Skeleton className="h-6 w-20" /> : <span className="break-words text-lg font-semibold">{value}</span>}</CardTitle></CardHeader>
            {detail && <CardContent className="min-w-0 break-words text-xs text-muted-foreground">{detail}</CardContent>}
          </Card>)}
        </div>
      </CardHeader>
      <CardContent className="min-w-0"><div className="grid min-w-0 gap-5 border-t pt-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)] lg:gap-6">
        <section className="min-w-0 lg:border-r lg:pr-6" aria-label={t("networkInformation")}>
          <h2 className="mb-3 text-xs font-medium text-muted-foreground">{t("networkInformation")}</h2>
          <dl className="flex min-w-0 flex-col text-sm" aria-busy={status === "loading"}>
            {rows.map(([label, value]) => <div className="grid min-w-0 grid-cols-[6rem_minmax(0,1fr)] items-start gap-3 border-b py-2 last:border-0" key={label}><dt className="text-muted-foreground">{label}</dt><dd className="min-w-0 break-words text-right">{status === "loading" ? <Skeleton className="ml-auto h-5 w-24" /> : status === "unavailable" ? "—" : value}</dd></div>)}
          </dl>
          {information && information.conflicts.length > 0 && <Alert><AlertTitle>{t("sourceConflict")}</AlertTitle><AlertDescription>{t("sourceConflictHint")}</AlertDescription></Alert>}
        </section>
        <SourceComparison key={result.address} address={result.address} information={information} primaryLoading={status === "loading"} revision={sourceRevision} />
      </div></CardContent>
      <CardFooter className="py-2 sm:py-3"><SourceAttribution /></CardFooter>
    </Card>
  </section>;
}
