"use client";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { echoSources, type EchoSnapshot } from "../protocol-probe";
import { StableIpAddress } from "./stable-ip-address";

export function ExitComparison({ rows, address, hidden }: { rows: EchoSnapshot; address?: string; hidden: boolean }) {
  const t = useTranslations("Sources"), app = useTranslations("App");
  return <section className="mt-4 min-w-0 border-t border-border/60 pt-4" aria-label={t("echoTitle")} data-exit-comparison>
    <h2 className="mb-2 report-section-title">{t("echoTitle")}</h2>
    <div className="grid min-w-0 gap-x-6 md:grid-cols-2">{echoSources.filter(source => source !== "site").map(source => {
      const row = rows[source], record = row.phase === "done" && row.outcome.ok ? row.outcome.data : null;
      const error = row.phase === "done" && !row.outcome.ok ? row.outcome.code : null;
      const status = record ? t(record.address === address ? "echoSame" : "echoDifferent") : t(error === "TIMEOUT" ? "timeout" : error === "RATE_LIMITED" ? "rateLimited" : "unavailable");
      return <div key={source} data-echo-source={source} className="min-w-0 border-b border-border/50 py-3 report-data last:border-0 last:pb-0 md:border-0 md:py-1">
        <div className="flex items-start justify-between gap-3"><a className="font-medium underline-offset-4 hover:underline" href={source === "ipify" ? "https://www.ipify.org/" : "https://api.ident.me/"} target="_blank" rel="noreferrer" translate="no">{source === "ipify" ? "ipify" : "ident.me"}</a><span className="report-meta text-right">{row.phase === "loading" ? <span className="sr-only" role="status">{app("loading")}</span> : status}</span></div>
        <div className="mt-1 min-w-0 font-mono [overflow-wrap:anywhere]" translate="no">{row.phase === "loading" ? <Skeleton className="h-4 w-36 max-w-full" /> : record ? <StableIpAddress address={record.address} hidden={hidden} /> : "—"}</div>
      </div>;
    })}</div>
  </section>;
}
