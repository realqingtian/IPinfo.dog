"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardAction, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { usePreferences } from "@/components/providers/preferences";
import { CopyButton } from "./copy-button";
import { localizedName } from "../demo";
import type { IpInformation } from "@/lib/contracts/ip";

export function IpResultCard({ result, status = "ready", onRefresh }: {
  result: IpInformation; status?: "ready" | "loading" | "unavailable"; onRefresh?: () => void;
}) {
  const t = useTranslations("App");
  const { locale } = usePreferences();
  const [hidden, setHidden] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const protocol = result.family === "ipv4" ? "IPv4" : "IPv6";
  const display = (value: string | number | null | undefined) => value ?? t("unknown");
  const rows = [
    [t("region"), display(localizedName(result.geolocatedCountry?.names, locale))],
    [t("city"), display(localizedName(result.city, locale))],
    [t("asn"), result.asn ? `AS${result.asn}` : t("unknown")],
    [t("organization"), display(result.organization)],
  ];
  return <Card role="region" aria-label={t("recordFor", { protocol })}>
    <CardHeader>
      <CardTitle><span className="inline-flex items-center gap-2">{protocol}<Badge variant="secondary">{status === "loading" ? t("loading") : status === "unavailable" ? t("unavailable") : t("sample")}</Badge></span></CardTitle>
      <CardAction className="flex items-center gap-0.5">
        <CopyButton value={result.address} label={t("copyAddress", { protocol })} />
        <Button variant="ghost" size="icon" aria-label={t(hidden ? "show" : "hide", { protocol })} title={t(hidden ? "show" : "hide", { protocol })} onClick={() => setHidden(!hidden)}>
          {hidden ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
        </Button>
        {onRefresh && <Button variant="ghost" size="icon" disabled={status === "loading"} aria-label={t("refreshOne", { protocol })} title={t("refreshOne", { protocol })} onClick={onRefresh}><RefreshCw aria-hidden /></Button>}
      </CardAction>
    </CardHeader>
    <CardContent className="flex min-w-0 flex-col gap-4">
      <p className="min-h-14 break-all font-mono text-xl leading-7 font-medium" aria-label={hidden ? t("hidden") : undefined}>{hidden ? "••••••••" : result.address}</p>
      <dl className="grid grid-cols-[minmax(5rem,auto)_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm" aria-busy={status === "loading"}>
        {rows.map(([label, value]) => <div className="contents" key={label}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 break-words">{status === "loading" ? <Skeleton className="h-5 w-24" /> : status === "unavailable" ? t("unavailable") : value}</dd>
        </div>)}
      </dl>
    </CardContent>
    <CardFooter>
      <Collapsible open={expanded} onOpenChange={setExpanded} className="w-full">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between">
            {t(expanded ? "closeDetails" : "details")}<ChevronDown data-icon="inline-end" aria-hidden />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <dl className="grid grid-cols-[minmax(5rem,auto)_minmax(0,1fr)] gap-x-4 gap-y-3 py-3 text-sm">
            {[
              [t("registeredCountry"), display(localizedName(result.registeredCountry?.names, locale))],
              [t("accuracyRadius"), result.accuracyRadiusKm === null ? t("unknown") : `${result.accuracyRadiusKm} km`],
              [t("source"), t("demoSource")], [t("version"), t("demoVersion")], [t("queriedAt"), t("demoVersion")],
            ].map(([label, value]) => <div className="contents" key={label}><dt className="text-muted-foreground">{label}</dt><dd className="min-w-0 break-words">{value}</dd></div>)}
          </dl>
        </CollapsibleContent>
      </Collapsible>
    </CardFooter>
  </Card>;
}
