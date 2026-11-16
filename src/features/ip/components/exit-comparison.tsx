"use client";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { echoProviders, ipipProvider, type ComparisonRows } from "../protocol-probe";
import { StableIpAddress } from "./stable-ip-address";

export function ExitComparison({ rows, address, hidden }: { rows: ComparisonRows; address?: string; hidden: boolean }) {
  const t = useTranslations("Sources"), app = useTranslations("App");
  return <section className="mt-4 min-w-0 border-t border-border/60 pt-4" aria-label={t("echoTitle")} data-exit-comparison>
    <h2 className="mb-2 report-section-title">{t("echoTitle")}</h2>
    <div className="grid min-w-0 gap-x-6 md:grid-cols-2">{[ipipProvider, ...echoProviders].map(({ id: source, link, name }) => {
      const row = rows[source], record = row.phase === "done" && row.outcome.ok ? row.outcome.data : null;
      const error = row.phase === "done" && !row.outcome.ok ? row.outcome.code : null;
      const otherFamily = row.phase === "done" ? row.otherFamily : undefined;
      const status = otherFamily ? t("echoVia", { protocol: otherFamily === "ipv6" ? "IPv6" : "IPv4" }) : record ? t(record.address === address ? "echoSame" : "echoDifferent") : t(error === "TIMEOUT" ? "timeout" : error === "RATE_LIMITED" ? "rateLimited" : "unavailable");
      return <div key={source} data-echo-source={source} className="min-w-0 border-b border-border/50 py-1.5 report-data last:border-0 last:pb-0 md:border-0 md:py-1">
        <div className="flex items-start justify-between gap-3"><a className="font-medium underline-offset-4 hover:underline" href={link} target="_blank" rel="noreferrer" translate="no">{name}</a><span className="report-meta text-right">{row.phase === "loading" ? <span className="sr-only" role="status">{app("loading")}</span> : status}</span></div>
        <div className="mt-1 min-w-0 font-mono [overflow-wrap:anywhere]" translate="no">{row.phase === "loading" ? <Skeleton className="h-4 w-36 max-w-full" /> : record ? <StableIpAddress address={record.address} hidden={hidden} /> : "—"}</div>
      </div>;
    })}</div>
    <div className="mt-3 flex flex-wrap items-center gap-x-3 report-meta">
      <span>{t("manualEcho")}</span>
      <a href="https://ip.me/" target="_blank" rel="noreferrer" className="underline underline-offset-2">IP.me ↗</a>
      <a href="https://ip.sb/" target="_blank" rel="noreferrer" className="underline underline-offset-2">IP.SB ↗</a>
    </div>
  </section>;
}
