"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { IpLoadingCard } from "./ip-loading-card";
import { createExitController, type Family, type ProbeOutcome } from "../exit";
import { createProtocolDetector, fetchIpipExit, ipipRow } from "../protocol-probe";
import { ExitComparison } from "./exit-comparison";
import { fetchIp } from "../client";
import { IpResultCard, IpResultToolbar } from "./ip-result-card";

export function HomeScreen() {
  const t = useTranslations("App");
  const [d4] = useState(() => createProtocolDetector("ipv4")), [d6] = useState(() => createProtocolDetector("ipv6"));
  const [v4] = useState(() => createExitController({ probe: d4.probe, lookup: fetchIp }));
  const [v6] = useState(() => createExitController({ probe: d6.probe, lookup: fetchIp }));
  const e4 = useSyncExternalStore(d4.subscribe, d4.getSnapshot, d4.getServerSnapshot);
  const e6 = useSyncExternalStore(d6.subscribe, d6.getSnapshot, d6.getServerSnapshot);
  const s4 = useSyncExternalStore(v4.subscribe, v4.getSnapshot, v4.getServerSnapshot);
  const s6 = useSyncExternalStore(v6.subscribe, v6.getSnapshot, v6.getServerSnapshot);
  const [choice, setChoice] = useState<Family | null>(null), [hidden, setHidden] = useState(false);
  const [revisions, setRevisions] = useState({ ipv4: 0, ipv6: 0 });
  const revision = revisions.ipv4 + revisions.ipv6;
  const [ipip, setIpip] = useState<{ revision: number; outcome: ProbeOutcome } | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    void fetchIpipExit(abort.signal).then(outcome => {
      if (!abort.signal.aborted) setIpip({ revision, outcome });
    });
    return () => abort.abort();
  }, [revision]);
  const currentIpip = ipip?.revision === revision ? ipip.outcome : undefined;
  const echoes = {
    ipv4: { ...e4, ipip: ipipRow("ipv4", currentIpip) },
    ipv6: { ...e6, ipip: ipipRow("ipv6", currentIpip) },
  };
  const active = choice ?? (s4.phase === "error" && !s4.basic && s6.basic ? "ipv6" : "ipv4");
  const controllers = { ipv4: v4, ipv6: v6 }, states = { ipv4: s4, ipv6: s6 }, current = states[active];
  const status = (phase: typeof current.phase) => phase === "detecting" || phase === "details" ? "loading" : phase === "error" ? "unavailable" : "ready";
  useEffect(() => { v4.refresh(); v6.refresh(); return () => { v4.dispose(); v6.dispose(); }; }, [v4, v6]);
  const refresh = (family: Family) => { setRevisions(value => ({ ...value, [family]: value[family] + 1 })); controllers[family].refresh(); };
  return <section className="flex min-w-0 flex-col gap-3">
    <h1 className="sr-only">{t("homeTitle")}</h1>
    <IpResultToolbar reserveActions result={current.basic} status={status(current.phase)} title={t("homeTitle")} hidden={hidden} onHiddenChange={setHidden} onRefresh={() => refresh(active)} protocolControl={
      <ToggleGroup type="single" value={active} size="sm" variant="outline" spacing={0} aria-label={t("chooseProtocol")} onValueChange={value => { if (value === "ipv4" || value === "ipv6") setChoice(value); }}>
        <ToggleGroupItem value="ipv4" className="min-h-11 sm:min-h-7">IPv4</ToggleGroupItem>
        <ToggleGroupItem value="ipv6" className="min-h-11 sm:min-h-7">IPv6</ToggleGroupItem>
      </ToggleGroup>
    } />
    {(["ipv4", "ipv6"] as const).map(family => {
      const state = states[family], protocol = family === "ipv4" ? "IPv4" : "IPv6";
      return <div key={family} hidden={family !== active} className={cn("min-w-0", family !== active && "hidden")} data-exit-family={family}>
        {state.basic ? <IpResultCard key={state.basic.address} result={state.information ?? state.basic} hidden={hidden} onHiddenChange={setHidden} sourceRevision={revisions[family]} status={status(state.phase)} showToolbar={false} echoRows={echoes[family]} />
          : state.phase === "detecting" ? <IpLoadingCard label={`${protocol} · ${t("detecting")}`} />
          : <Card><CardHeader><CardTitle>{t("familyNotDetected", { protocol })}</CardTitle></CardHeader><CardContent className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">{t(state.error === "RATE_LIMITED" ? "rateLimited" : state.error === "TIMEOUT" ? "exitTimeout" : "exitNetworkHint")}</p>
            <Button variant="outline" size="sm" onClick={() => refresh(family)}>{t("retry")}</Button>
            <div className="w-full"><ExitComparison rows={echoes[family]} hidden={hidden} /></div>
          </CardContent></Card>}
        {state.phase === "error" && state.basic && <Alert className="mt-3"><AlertTitle>{t("exitDetailsFailed", { protocol })}</AlertTitle><AlertDescription>
          <p>{t(state.error === "NO_RECORD" ? "noRecord" : state.error === "RATE_LIMITED" ? "rateLimited" : state.error === "TIMEOUT" ? "queryTimeout" : "exitAddressKept")}</p>
          <Button variant="outline" size="sm" onClick={controllers[family].retryDetails}>{t("retry")}</Button>
        </AlertDescription></Alert>}
      </div>;
    })}
  </section>;
}
