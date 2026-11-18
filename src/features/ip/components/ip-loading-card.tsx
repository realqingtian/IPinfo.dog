"use client";
import { Card, CardContent } from "@/components/ui/card";
import { IpReportHeader } from "./ip-report-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { IpNetworkFields } from "./ip-network-fields";
import { comparisonPlan } from "../comparison-catalog";
import { ComparisonRow, ComparisonTableFrame } from "./comparison-table";

function ComparisonSkeleton({ mobile }: { mobile: boolean }) {
  return <ComparisonTableFrame mobile={mobile} busy>{comparisonPlan("home").map(source =>
    <ComparisonRow key={source.id} source={source} mobile={mobile} state="loading" />
  )}</ComparisonTableFrame>;
}

export function IpLoadingCard({ label }: { label: string }) {
  const t = useTranslations("App"), sources = useTranslations("Sources");
  return <Card role="region" aria-label={label} aria-busy="true" data-ip-loading className="report-card">
    <IpReportHeader summary={<><Skeleton className="h-5 w-56 max-w-full" /><span className="sr-only" role="status">{label}</span></>} />
    <CardContent><div className="report-body">
      <div className="report-network">
        <h2 className="report-section-title">{t("networkInformation")}</h2>
        <IpNetworkFields status="loading" />
      </div>
      <div className="report-comparison">
        <h2 className="report-section-title">{sources("title")}</h2>
        <div className="hidden md:block"><ComparisonSkeleton mobile={false} /></div>
        <div className="md:hidden"><ComparisonSkeleton mobile /></div>
      </div>
    </div></CardContent>
  </Card>;
}
