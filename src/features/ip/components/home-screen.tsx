"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { demoRecord } from "../demo";
import { IpResultCard } from "./ip-result-card";

type Family = "ipv4" | "ipv6";
const records = { ipv4: demoRecord("ipv4"), ipv6: demoRecord("ipv6") };

export function HomeScreen() {
  const t = useTranslations("App");
  const [loading, setLoading] = useState({ ipv4: false, ipv6: false });
  const timers = useRef<Partial<Record<Family, ReturnType<typeof setTimeout>>>>({});
  useEffect(() => {
    const scheduled = timers.current;
    return () => Object.values(scheduled).forEach(clearTimeout);
  }, []);
  function refresh(family: Family) {
    clearTimeout(timers.current[family]);
    setLoading((previous) => ({ ...previous, [family]: true }));
    timers.current[family] = setTimeout(() => {
      setLoading((previous) => ({ ...previous, [family]: false }));
      delete timers.current[family];
    }, family === "ipv4" ? 450 : 700);
  }
  const busy = loading.ipv4 || loading.ipv6;
  return <section className="flex flex-col gap-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">{t("homeTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("homeDescription")}</p>
      </div>
      <Button variant="outline" disabled={busy} onClick={() => { refresh("ipv4"); refresh("ipv6"); }}>
        {busy ? <Spinner data-icon="inline-start" aria-hidden /> : <RefreshCw data-icon="inline-start" aria-hidden />}{t("refresh")}
      </Button>
    </div>
    <div className="grid min-w-0 gap-4 md:grid-cols-2">
      {(["ipv4", "ipv6"] as const).map((family) => <IpResultCard key={family} result={records[family]} status={loading[family] ? "loading" : "ready"} onRefresh={() => refresh(family)} />)}
    </div>
  </section>;
}
