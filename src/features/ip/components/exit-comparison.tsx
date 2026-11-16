"use client";
import { useTranslations } from "next-intl";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { echoSources, type EchoSnapshot } from "../protocol-probe";
import { ipDisplayParts, maskIpAddress } from "../presentation";
import { Fragment } from "react";

export function ExitComparison({ rows, address, hidden }: { rows: EchoSnapshot; address?: string; hidden: boolean }) {
  const t = useTranslations("Sources"), app = useTranslations("App");
  return <section className="mt-5 min-w-0 border-t pt-5" aria-label={t("echoTitle")} data-exit-comparison>
    <h2 className="mb-3 text-xs font-medium text-muted-foreground">{t("echoTitle")}</h2>
    <Table className="table-fixed" aria-label={t("echoTitle")}>
      <colgroup><col className="w-20 sm:w-24" /><col /><col className="w-24" /></colgroup>
      <TableHeader><TableRow><TableHead>{t("source")}</TableHead><TableHead>{app("inputLabel")}</TableHead><TableHead>{t("echoStatus")}</TableHead></TableRow></TableHeader>
      <TableBody>{echoSources.map(source => {
        const row = rows[source], record = row.phase === "done" && row.outcome.ok ? row.outcome.data : null;
        const error = row.phase === "done" && !row.outcome.ok ? row.outcome.code : null;
        const display = record ? hidden ? maskIpAddress(record.address) : record.address : "—";
        return <TableRow key={source} data-echo-source={source}>
          <TableCell>{source === "site" ? t("echoSite") : <a className="underline-offset-4 hover:underline" href={source === "ipify" ? "https://www.ipify.org/" : "https://api.ident.me/"} target="_blank" rel="noreferrer" translate="no">{source === "ipify" ? "ipify" : "ident.me"}</a>}</TableCell>
          <TableCell className="font-mono whitespace-normal [overflow-wrap:anywhere]" translate="no">{row.phase === "loading" ? <Skeleton className="h-4 w-20 max-w-full" /> : ipDisplayParts(display).map((part, i) => <Fragment key={i}>{i > 0 && <wbr />}{part}</Fragment>)}</TableCell>
          <TableCell className="whitespace-normal text-muted-foreground">{row.phase === "loading" ? <span className="sr-only" role="status">{app("loading")}</span> : record ? t(record.address === address ? "echoSame" : "echoDifferent") : row.otherFamily ? t("echoOtherProtocol", { protocol: row.otherFamily === "ipv4" ? "IPv4" : "IPv6" }) : t(error === "TIMEOUT" ? "timeout" : error === "RATE_LIMITED" ? "rateLimited" : "unavailable")}</TableCell>
        </TableRow>;
      })}</TableBody>
    </Table>
  </section>;
}
