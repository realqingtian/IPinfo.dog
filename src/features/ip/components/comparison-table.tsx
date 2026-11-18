"use client";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { RegionFlag } from "@/components/region-flag";
import { usePreferences } from "@/components/providers/preferences";
import type { GeoCountry, LocalizedName } from "@/lib/contracts/ip";
import type { ComparisonSource } from "../comparison-catalog";
import { localizedCountry, localizedName } from "../presentation";
import { SourceLink } from "./source-link";

/** One column/header contract for both pages, breakpoints and loading states. */
export function ComparisonTableFrame({ mobile, busy = false, children }: { mobile: boolean; busy?: boolean; children: ReactNode }) {
  const t = useTranslations("Sources"), app = useTranslations("App");
  const labels = [t("source"), t("countryCity"), ...(mobile ? [] : [app("asn"), t("updated")])];
  return <Table className="report-table report-data" aria-label={t("title")} aria-busy={busy || undefined}>
    <colgroup>{(mobile ? ["w-[34%]", "w-[16%]", "w-1/2"] : ["w-[18%]", "w-[18%]", "w-[32%]", "w-[12%]", "w-[20%]"]).map((width, index) => <col key={index} className={width} />)}</colgroup>
    <TableHeader><TableRow data-geo-head>{labels.map((label, index) => <TableHead key={label} scope="col" colSpan={index === 1 ? 2 : 1} className="px-1 report-table-label">{label}</TableHead>)}</TableRow></TableHeader>
    <TableBody>{children}</TableBody>
  </Table>;
}

/** Adapters supply facts; links, flags, metadata, feedback and retry UI live here. */
export function ComparisonRow({ source, mobile, state, location, asn, asnLoading = false, date, dateTitle, details, feedback, retry, updateWarning = false, echo = false }: {
  source: ComparisonSource; mobile: boolean; state: "loading" | "ready" | "error" | "waiting";
  location?: { country: GeoCountry | null | undefined; city: LocalizedName | null | undefined };
  asn?: number | null; asnLoading?: boolean; date?: string; dateTitle?: string; details?: string;
  feedback?: ReactNode; retry?: () => void; updateWarning?: boolean; echo?: boolean;
}) {
  const t = useTranslations("Sources"), app = useTranslations("App"), { locale } = usePreferences();
  const asnLabel = asn ? `AS${asn}` : "—", updated = date ?? "—";
  const warning = updateWarning ? <span title={t("updateWarning")}><TriangleAlert className="inline size-3" aria-hidden /><span className="sr-only">{t("updateWarning")}</span></span> : null;
  return <TableRow className="ip-source-row" data-comparison-source={source.id} data-target-capable={source.query !== null}
    {...(mobile ? { "data-mobile-provider": source.id } : { "data-provider": source.id })}
    data-state={state} data-echo-source={echo ? source.id : undefined} data-retryable={echo ? !!retry : undefined}
    data-location-state={echo ? state : undefined} title={details}>
    <TableCell><SourceLink href={source.href} label={source.label} title={[source.title, details].filter(Boolean).join(" · ") || undefined} /> {mobile && warning}</TableCell>
    <TableCell colSpan={2}>
      {state === "loading" ? <><Skeleton className="h-4 w-32 max-w-full" /><span className="sr-only" role="status">{app("loading")}</span></>
        : location ? <span data-echo-location={echo || undefined} className="inline-flex max-w-full flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="inline-flex items-center gap-1.5"><RegionFlag code={location.country?.code} size={mobile ? 14 : 18} />{localizedCountry(location.country, locale)}</span>
          <span>{localizedName(location.city, locale) || "—"}</span>
        </span> : <span className="text-muted-foreground" role={state === "error" ? "status" : undefined}>{feedback}</span>}
      {retry && <Button variant="ghost" size="sm" className="ml-1 min-h-11 sm:min-h-7" aria-label={t("retrySource", { source: source.label })} onClick={retry}><RefreshCw data-icon="inline-start" aria-hidden />{app("retry")}</Button>}
      {mobile && state === "ready" && <span className="sr-only" title={dateTitle ?? updated}><span data-source-asn>{asnLabel}</span> · {t("updated")} {updated} {details}</span>}
      {!mobile && details && <span className="sr-only">{details}</span>}
    </TableCell>
    {!mobile && <>
      <TableCell data-source-asn={state === "ready" && !asnLoading ? true : undefined} translate="no">{asnLoading || state === "loading" ? <Skeleton className="h-4 w-16 max-w-full" /> : asnLabel}</TableCell>
      <TableCell className="text-muted-foreground" title={dateTitle}>{state === "loading" ? <Skeleton className="h-4 w-20 max-w-full" /> : <>{updated} {warning}</>}</TableCell>
    </>}
  </TableRow>;
}
