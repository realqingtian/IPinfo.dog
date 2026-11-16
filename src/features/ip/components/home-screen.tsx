"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { createExitController, fetchExit } from "../exit";
import { fetchIp } from "../client";
import { apiUrl } from "@/lib/api-url";
import { IpResultCard } from "./ip-result-card";

function ExitCard() {
  const t = useTranslations("App"), protocol = t("currentIp");
  const [controller] = useState(() => createExitController({ probe: (signal) => fetchExit(apiUrl("/api/connection"), "any", signal), lookup: fetchIp }));
  const [hidden, setHidden] = useState(false);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getServerSnapshot);
  useEffect(() => { controller.refresh(); return () => controller.dispose(); }, [controller]);
  return <div className="flex min-w-0 flex-col gap-3" aria-live="polite">
    {state.basic ? <IpResultCard title={t("homeTitle")} result={state.information ?? state.basic} hidden={hidden} onHiddenChange={setHidden} status={state.phase === "details" ? "loading" : state.phase === "error" ? "unavailable" : "ready"} onRefresh={controller.refresh} />
      : <Card role="region" aria-label={t("recordFor", { protocol })}>
        <CardHeader><CardTitle>{protocol}</CardTitle><CardAction><Button variant="ghost" size="icon" onClick={controller.refresh} aria-label={t("refreshRecord", { protocol })}><RefreshCw aria-hidden /></Button></CardAction></CardHeader>
        <CardContent className="flex flex-col gap-4"><p className="min-h-14 text-xl leading-7 font-medium">{t(state.phase === "detecting" ? "detecting" : "exitNotDetected")}</p>
          {state.phase === "detecting" && <Skeleton className="h-28 w-full" />}
        </CardContent>
      </Card>}
    {state.phase === "details" && <p role="status" className="text-sm text-muted-foreground">{t("detailsPending")}</p>}
    {state.phase === "error" && <Alert><AlertTitle>{t(state.basic ? "exitDetailsFailed" : "exitProbeFailed", { protocol })}</AlertTitle><AlertDescription>
      <p>{t(state.basic ? state.error === "NO_RECORD" ? "noRecord" : state.error === "RATE_LIMITED" ? "rateLimited" : state.error === "TIMEOUT" ? "queryTimeout" : "exitAddressKept" : state.error === "RATE_LIMITED" ? "rateLimited" : state.error === "TIMEOUT" ? "exitTimeout" : "exitNetworkHint")}</p>
      <Button variant="outline" size="sm" onClick={state.basic ? controller.retryDetails : controller.refresh}>{t("retry")}</Button>
    </AlertDescription></Alert>}
  </div>;
}
export function HomeScreen() {
  const t = useTranslations("App");
  return <section className="flex min-w-0 flex-col gap-4">
    <h1 className="sr-only">{t("homeTitle")}</h1>
    <ExitCard />
  </section>;
}
