import type { ReactNode } from "react";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RegionFlag } from "@/components/region-flag";
import { StableIpAddress } from "./stable-ip-address";

/** Keep the flag slot, IP baseline and summary gap identical in every load phase. */
export function IpReportHeader({ address, hidden = false, countryCode, addressLabel, summary }: {
  address?: string; hidden?: boolean; countryCode?: string | null; addressLabel?: string; summary: ReactNode;
}) {
  return <CardHeader className="gap-0 has-data-[slot=card-description]:grid-rows-1">
    <div className="min-w-0">
      <CardTitle className="flex min-w-0 items-start gap-3">
        <span className="mt-1 inline-flex shrink-0">{address ? <RegionFlag code={countryCode} size={24} /> : <Skeleton className="h-6 w-8 rounded-none" />}</span>
        <span translate="no" className="min-w-0 report-ip [overflow-wrap:anywhere]" aria-label={addressLabel} data-ip-address-slot>
          {address ? <StableIpAddress address={address} hidden={hidden} /> : <Skeleton className="h-[1lh] w-64 max-w-full" />}
        </span>
      </CardTitle>
      <CardDescription className="report-data mt-1 min-w-0 break-words leading-5">{summary}</CardDescription>
    </div>
  </CardHeader>;
}
