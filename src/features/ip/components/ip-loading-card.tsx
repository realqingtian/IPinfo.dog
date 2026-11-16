"use client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function IpLoadingCard({ label }: { label: string }) {
  return <Card role="region" aria-label={label} aria-busy="true" data-ip-loading className="min-w-0 rounded-xl [--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(6)]">
    <CardHeader><CardTitle><Skeleton className="h-9 w-64 max-w-full" /></CardTitle>
      <CardDescription><Skeleton className="h-5 w-48 max-w-3/4" /><span className="sr-only" role="status">{label}</span></CardDescription>
    </CardHeader>
    <CardContent><div className="grid gap-5 border-t pt-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.7fr)] lg:gap-6">
      <div className="flex min-w-0 flex-col gap-4 lg:border-r lg:pr-6">
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="flex justify-between gap-4"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-32 max-w-1/2" /></div>)}
      </div>
      <div className="flex min-w-0 flex-col gap-5">
        <Skeleton className="h-4 w-20" />
        {Array.from({ length: 3 }, (_, i) => <div key={i} className="grid grid-cols-3 gap-4"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /></div>)}
      </div>
    </div></CardContent>
  </Card>;
}
