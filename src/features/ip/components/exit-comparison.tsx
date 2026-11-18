"use client";
import { useTranslations } from "next-intl";
import type { EchoRow, EchoId } from "../protocol-probe";
import { needsEchoGeography, needsEchoLookup } from "../echo-geography";
import type { EchoLocation } from "../echo-locations";
import { supplementedCity, maskIpAddress } from "../presentation";
import { ComparisonRow } from "./comparison-table";
import type { ComparisonSource } from "../comparison-catalog";

export function EchoTableRow({ source, row, address, hidden, locations, onRetry, mobile, onEchoRetry }: {
  onEchoRetry?: (id: EchoId) => void; source: ComparisonSource; row: EchoRow; address?: string; hidden: boolean;
  locations: Record<string, EchoLocation>; onRetry: (address: string) => void; mobile: boolean;
}) {
  const t = useTranslations("Sources");
  const record = row.phase === "done" && row.outcome.ok ? row.outcome.data : null;
  const location = record ? locations[record.address] : undefined;
  const information = location?.phase === "done" && location.outcome.ok ? location.outcome.data : null;
  const error = row.phase === "done" && !row.outcome.ok ? row.outcome.code : null;
  const status = record ? t(record.address === address ? "echoSame" : "echoDifferent")
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
    : !record && row.phase === "done" && onEchoRetry ? () => onEchoRetry(source.echo!) : undefined;
  const loading = row.phase === "loading" || locationMissing && (!location || location.phase === "loading");
  return <ComparisonRow source={source} mobile={mobile} echo
    state={loading ? "loading" : hasLocation ? "ready" : "error"}
    location={hasLocation && !loading ? { country, city } : undefined} asn={asn} asnLoading={asnLoading}
    date={record ? t("online") : undefined} details={details}
    feedback={record ? t("locationUnavailable") : status} retry={retry} />;
}
