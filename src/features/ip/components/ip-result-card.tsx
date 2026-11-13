"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ChevronDown, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardAction, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { usePreferences } from "@/components/providers/preferences";
import { CopyButton } from "./copy-button";
import { localizedName, displayTime } from "../presentation";
import type { GeoCountry, IpInformation } from "@/lib/contracts/ip";

export function IpResultCard({ result, status = "ready", onRefresh, hidden: controlledHidden, onHiddenChange }: {
  result: IpInformation | Pick<IpInformation, "address" | "family">; status?: "ready" | "loading" | "unavailable"; onRefresh?: () => void;
  hidden?: boolean; onHiddenChange?: (hidden: boolean) => void;
}) {
  const t = useTranslations("App");
  const { locale } = usePreferences();
  const [ownHidden, setOwnHidden] = useState(false);
  const hidden = controlledHidden ?? ownHidden;
  const setHidden = onHiddenChange ?? setOwnHidden;
  const [expanded, setExpanded] = useState(false);
  const protocol = result.family === "ipv4" ? "IPv4" : "IPv6";
  const information = "datasetId" in result ? result : null;
  const demo = information?.datasetId === "interface-demo";
  const countryName = (value: GeoCountry | null | undefined) => localizedName(value?.names, locale) || value?.code || t("unknown");
  const display = (value: string | number | null | undefined) => value ?? t("unknown");
  const rows = [
    [t("region"), countryName(information?.geolocatedCountry)],
    [t("city"), display(localizedName(information?.city, locale))],
    [t("asn"), information?.asn ? `AS${information.asn}` : t("unknown")],
    [t("organization"), display(information?.organization)],
  ];
  return <Card role="region" aria-label={t("recordFor", { protocol })}>
    <CardHeader>
      <CardTitle><span className="inline-flex items-center gap-2">{protocol}{(status !== "ready" || demo) && <Badge variant="secondary">{status === "loading" ? t("loading") : status === "unavailable" ? t("unavailable") : t("sample")}</Badge>}</span></CardTitle>
      <CardAction className="flex items-center gap-0.5">
        <CopyButton value={result.address} label={t("copyAddress", { protocol })} />
        <Button variant="ghost" size="icon" aria-label={t(hidden ? "show" : "hide", { protocol })} title={t(hidden ? "show" : "hide", { protocol })} onClick={() => setHidden(!hidden)}>
          {hidden ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
        </Button>
        {onRefresh && <Button variant="ghost" size="icon" disabled={status === "loading"} aria-label={t(demo ? "refreshOne" : "refreshRecord", { protocol })} title={t(demo ? "refreshOne" : "refreshRecord", { protocol })} onClick={onRefresh}><RefreshCw aria-hidden /></Button>}
      </CardAction>
    </CardHeader>
    <CardContent className="flex min-w-0 flex-col gap-4">
      <p translate="no" className="min-h-14 break-all font-mono text-xl leading-7 font-medium" aria-label={hidden ? t("hidden") : undefined}>{hidden ? "••••••••" : result.address}</p>
      <dl className="grid grid-cols-[minmax(5rem,auto)_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm" aria-busy={status === "loading"}>
        {rows.map(([label, value]) => <div className="contents" key={label}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 break-words">{status === "loading" ? <Skeleton className="h-5 w-24" /> : status === "unavailable" ? t("unavailable") : value}</dd>
        </div>)}
      </dl>
      {!demo && information && information.conflicts.length > 0 && <Alert><AlertTitle>{t("sourceConflict")}</AlertTitle><AlertDescription>
        <p>{t("sourceConflictHint")}</p>
      </AlertDescription></Alert>}
    </CardContent>
    {information && <CardFooter>
      <Collapsible open={expanded} onOpenChange={setExpanded} className="w-full">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between">
            {t(expanded ? "closeDetails" : "details")}<ChevronDown data-icon="inline-end" aria-hidden />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <dl className="grid grid-cols-[minmax(5rem,auto)_minmax(0,1fr)] gap-x-4 gap-y-3 py-3 text-sm">
            {[
              [t("registeredCountry"), countryName(information.registeredCountry)],
              ...(!demo ? [[t("subdivisions"), information.subdivisions.map((value) => localizedName(value, locale) || t("unknown")).join(" / ") || t("unknown")]] : []),
              [t("accuracyRadius"), information.accuracyRadiusKm === null ? t("unknown") : `${information.accuracyRadiusKm} km`],
              [t("queriedAt"), demo ? t("demoVersion") : displayTime(information.queriedAt, locale)],
            ].map(([label, value]) => <div className="contents" key={label}><dt className="text-muted-foreground">{label}</dt><dd className="min-w-0 break-all">{value}</dd></div>)}
          </dl>
          <Collapsible data-source-details>
            <CollapsibleTrigger asChild><Button variant="ghost" size="sm">{t("source")}<ChevronDown data-icon="inline-end" aria-hidden /></Button></CollapsibleTrigger>
            <CollapsibleContent>
              <dl className="grid grid-cols-[minmax(5rem,auto)_minmax(0,1fr)] gap-x-4 gap-y-3 py-3 text-sm">
                <dt className="text-muted-foreground">{t("source")}</dt><dd className="min-w-0 break-words">{demo ? t("demoSource") : information.sources.map((source) => source.edition).join(" / ")}</dd>
                <dt className="text-muted-foreground">{t("version")}</dt><dd className="min-w-0 break-all">{demo ? t("demoVersion") : information.datasetId}</dd>
            {!demo && information.sources.map((source) => <div className="contents" key={source.edition}><dt className="text-muted-foreground">{source.edition}</dt><dd className="min-w-0 break-words">{displayTime(source.buildTime, locale)}</dd></div>)}
            {!demo && Object.entries(information.fieldSources).map(([field, source]) => <div className="contents" key={field}><dt className="text-muted-foreground">{t("fieldSource", { field: t(({ geolocatedCountry: "region", registeredCountry: "registeredCountry", subdivisions: "subdivisions", city: "city", accuracyRadiusKm: "accuracyRadius", asn: "asn", organization: "organization" } as const)[field as keyof typeof information.fieldSources]) })}</dt><dd className="min-w-0 break-words">{source || t("unknown")}</dd></div>)}
              </dl>
              {!demo && information.conflicts.map(conflict => <p key={conflict.field} className="break-words py-2 text-xs text-muted-foreground">{t(conflict.field === "geolocatedCountry" ? "region" : "registeredCountry")}: GeoLite2-City — {countryName(conflict.city)}; GeoLite2-Country — {countryName(conflict.country)}</p>)}
            </CollapsibleContent>
          </Collapsible>
        </CollapsibleContent>
      </Collapsible>
    </CardFooter>}
  </Card>;
}
