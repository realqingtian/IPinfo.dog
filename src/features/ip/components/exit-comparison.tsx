"use client";
import { useTranslations } from "next-intl";
import { TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { EchoRow } from "../protocol-probe";
import { StableIpAddress } from "./stable-ip-address";

export function EchoTableRow({ provider, row, address, hidden, valueColumns }: {
  provider: { id: string; name: string; link: string }; row: EchoRow; address?: string; hidden: boolean; valueColumns: number;
}) {
  const t = useTranslations("Sources"), app = useTranslations("App");
  const record = row.phase === "done" && row.outcome.ok ? row.outcome.data : null;
  const error = row.phase === "done" && !row.outcome.ok ? row.outcome.code : null;
  const other = row.phase === "done" ? row.otherFamily : undefined;
  const status = other ? t("echoVia", { protocol: other === "ipv6" ? "IPv6" : "IPv4" })
    : record ? t(record.address === address ? "echoSame" : "echoDifferent")
    : t(error === "TIMEOUT" ? "timeout" : error === "RATE_LIMITED" ? "rateLimited" : "unavailable");
  return <TableRow data-echo-source={provider.id}>
    <TableCell><a href={provider.link} target="_blank" rel="noreferrer" translate="no" className="underline-offset-4 hover:underline">{provider.name}</a></TableCell>
    <TableCell colSpan={valueColumns}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <div className="min-w-0 max-w-full font-mono" translate="no">{row.phase === "loading" ? <Skeleton className="h-4 w-20" /> : record ? <StableIpAddress address={record.address} hidden={hidden} /> : "—"}</div>
        <span className="ml-auto text-right report-meta">{row.phase === "loading" ? <span className="sr-only" role="status">{app("loading")}</span> : status}</span>
      </div>
    </TableCell>
  </TableRow>;
}
