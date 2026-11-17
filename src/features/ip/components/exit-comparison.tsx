"use client";
import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RegionFlag } from "@/components/region-flag";
import { usePreferences } from "@/components/providers/preferences";
import type { EchoRow, EchoId } from "../protocol-probe";
import { needsEchoGeography, needsEchoLookup } from "../echo-geography";
import type { EchoLocation } from "../echo-locations";
import { localizedCountry, supplementedCity, localizedName, maskIpAddress } from "../presentation";
import { SourceLink } from "./source-link";

export function EchoTableRow({ provider, row, address, hidden, locations, onRetry, mobile, onEchoRetry }: {
  onEchoRetry?: (id: EchoId) => void; provider: { id: EchoId; name: string; link: string }; row: EchoRow; address?: string; hidden: boolean;
  locations: Record<string, EchoLocation>; onRetry: (address: string) => void; mobile: boolean;
}) {
  const t = useTranslations("Sources"), app = useTranslations("App"), { locale } = usePreferences();
  const record = row.phase === "done" && row.outcome.ok ? row.outcome.data : null;
  const location = record ? locations[record.address] : undefined;
  const information = location?.phase === "done" && location.outcome.ok ? location.outcome.data : null;
  const error = row.phase === "done" && !row.outcome.ok ? row.outcome.code : null;
  const other = row.phase === "done" ? row.otherFamily : undefined;
  const status = other ? t("returnedProtocol", { protocol: other === "ipv6" ? "IPv6" : "IPv4" })
    : record ? t(record.address === address ? "echoSame" : "echoDifferent")
    : t(error === "TIMEOUT" ? "timeout" : error === "RATE_LIMITED" ? "rateLimited" : "unavailable");
  const needsFallback = !!record && needsEchoLookup(record.location);
  const locationMissing = !!record && needsEchoGeography(record.location);
  const asn = record?.location?.asn ?? information?.asn;
  const asnLabel = asn ? `AS${asn}` : "—";
  const asnLoading = !!record && !record.location?.asn && (!location || location.phase === "loading");
  const details = record ? [hidden ? maskIpAddress(record.address) : record.address, status, asnLabel, ...(needsFallback ? [t("localEchoLocation")] : [])].join(" · ") : status;
  const country = record?.location?.country ?? information?.geolocatedCountry;
  const city = supplementedCity(record?.location?.city, record?.location?.country, information);
  const hasLocation = !!country || !!city;
  const localFailure = needsFallback && location?.phase === "done" && !location.outcome.ok;
  const retry = record && localFailure ? () => onRetry(record.address)
    : !record && row.phase === "done" && onEchoRetry ? () => onEchoRetry(provider.id) : undefined;
  const loading = row.phase === "loading" || locationMissing && (!location || location.phase === "loading");
  return <TableRow data-comparison-source={provider.id} data-echo-source={provider.id} data-retryable={!!retry} data-location-state={hasLocation && !loading ? "ready" : loading ? "loading" : "error"} title={details}>
    <TableCell><SourceLink href={provider.link} label={provider.name} title={details} /></TableCell>
    <TableCell colSpan={2}>
      {loading ? <><Skeleton className="h-4 w-32 max-w-full" /><span className="sr-only" role="status">{app("loading")}</span></> : hasLocation ? <span data-echo-location className="inline-flex max-w-full flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="inline-flex items-center gap-1.5"><RegionFlag code={country?.code} size={mobile ? 14 : 18} />{localizedCountry(country, locale)}</span>
        <span>{localizedName(city, locale) || "—"}</span>
      </span> : <span className="inline-flex max-w-full flex-wrap items-center gap-1 text-muted-foreground">{record ? t("locationUnavailable") : status}

      </span>}
      {retry && <Button variant="ghost" size="sm" className="ml-1 min-h-11 sm:min-h-7" aria-label={t("retrySource", { source: provider.name })} onClick={retry}><RefreshCw className="size-3" aria-hidden />{app("retry")}</Button>}
      <span className="sr-only">{details}</span>
    </TableCell>
    {!mobile && <><TableCell data-source-asn={asnLoading ? undefined : true} translate="no">{asnLoading ? <Skeleton className="h-4 w-16 max-w-full" /> : asnLabel}</TableCell><TableCell className="text-muted-foreground">{t("online")}</TableCell></>}
  </TableRow>;
}
