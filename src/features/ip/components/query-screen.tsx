"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { IpSearchForm } from "./ip-search-form";
import { useReportNavigation } from "./report-navigation";
import { createQueryController, readQuery, queryPath } from "../query";
import { createHistoryStore, historyKey } from "../history";
import { fetchIp } from "../client";
import { IpResultCard, IpResultToolbar } from "./ip-result-card";

const subscribeSearchSlot = () => () => {};
const getSearchSlot = () => document.getElementById("query-search-slot");
const getServerSearchSlot = () => null;

export function QueryScreen() {
  const t = useTranslations("App"), search = useSearchParams().toString();
  const input = useRef<HTMLInputElement>(null);
  const section = useRef<HTMLElement>(null);
  const searchSlot = useSyncExternalStore(subscribeSearchSlot, getSearchSlot, getServerSearchSlot);
  const [draftError, setDraftError] = useState<{ search: string; value: string; code: "INVALID_IP" | "NON_PUBLIC_IP" } | null>(null);
  const [sourceRevision, setSourceRevision] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [history] = useState(() => createHistoryStore(() => localStorage));
  const [controller] = useState(() => createQueryController({ initial: readQuery(search), lookup: fetchIp, onSuccess: history.record }));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getServerSnapshot);
  const { rememberAddress } = useReportNavigation();
  useEffect(() => { rememberAddress(state.target); }, [state.target, rememberAddress]);
  const recent = useSyncExternalStore(history.subscribe, history.getSnapshot, history.getServerSnapshot);
  useEffect(() => { controller.navigate(readQuery(search)); }, [controller, search]);
  useEffect(() => () => controller.dispose(), [controller]);
  useEffect(() => {
    history.load();
    const changed = (event: StorageEvent) => { if (!event.key || event.key === historyKey) history.load(); };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, [history]);
  function submit(value: string) {
    const path = queryPath(value);
    const selection = readQuery(path.split("?")[1]);
    if (selection.error === "INVALID_IP" || selection.error === "NON_PUBLIC_IP") {
      setDraftError({ search, value, code: selection.error });
      input.current?.focus();
      return;
    }
    setDraftError(null);
    setSourceRevision(value => value + 1);
    controller.navigate(selection, true, true);
    if (location.pathname + location.search !== path) window.history.pushState(null, "", path);
    if (window.matchMedia("(pointer: coarse)").matches) input.current?.blur();
    if (section.current && section.current.getBoundingClientRect().top < 0) section.current.scrollIntoView({ block: "start" });
  }
  const invalidTarget = state.error === "INVALID_IP" || state.error === "NON_PUBLIC_IP";
  const inputError = draftError?.search === search && draftError.value === state.draft ? draftError.code
    : invalidTarget && state.draft === readQuery(search).input ? state.error : null;
  const errors = { INVALID_IP: "invalidIp", NON_PUBLIC_IP: "nonPublicIp", NO_RECORD: "noRecord", DATA_UNAVAILABLE: "queryUnavailable", TIMEOUT: "queryTimeout", RATE_LIMITED: "rateLimited" } as const;
  const basic = state.target && !invalidTarget ? { address: state.target, family: state.target.includes(":") ? "ipv6" as const : "ipv4" as const } : null;
  const status = state.phase === "loading" ? "loading" : state.phase === "error" ? "unavailable" : "ready";
  const refresh = () => { setSourceRevision(value => value + 1); controller.navigate(readQuery(search), true, true); };
  return <section ref={section} className="ip-screen">

      {searchSlot && createPortal(<IpSearchForm value={state.draft} inputRef={input} onChange={value => { setDraftError(null); controller.setDraft(value); }} onSubmit={submit}
        error={inputError ? t(errors[inputError]) : null} busy={state.phase === "loading"} />, searchSlot)}
    <IpResultToolbar result={basic} status={status} title={<h1>{t("queryTitle")}</h1>} hidden={hidden} onHiddenChange={setHidden} onRefresh={refresh} />
    {basic && <IpResultCard key={basic.address} result={state.result ?? basic} status={status} sourceRevision={sourceRevision} showToolbar={false} hidden={hidden} onHiddenChange={setHidden} /> }
    {!basic && <Card className="report-card" data-query-empty>
      <CardContent className="pb-5">
        <h2 className="report-section-title mb-1.5">{t("queryEmptyTitle")}</h2>
        <p className="report-data text-muted-foreground">{t("queryEmptyHint")}</p>
      </CardContent>
    </Card>}
    {state.phase === "error" && !invalidTarget && state.error && <Alert><CircleAlert aria-hidden /><AlertTitle>{t("partialInformation")}</AlertTitle><AlertDescription>
      <p>{t(errors[state.error])}</p>{state.retryAfter && <p>{t("retryAfter", { seconds: state.retryAfter })}</p>}
      {state.retryable && <Button variant="outline" size="sm" onClick={() => controller.navigate(readQuery(search), true, true)}>{t("retry")}</Button>}
    </AlertDescription></Alert>}
    {(recent.items.length > 0 || !recent.available) && <section className="query-history" aria-label={t("recentQueries")}>
      <h2>{t("recentQueries")}</h2>
      <span title={t("historyNotice")} className="sr-only">{t("historyNotice")}</span>
      {recent.items.map((address) => <Button key={address} variant="ghost" size="sm" onClick={() => submit(address)}>{address}</Button>)}
      {recent.items.length > 0 && <Button variant="ghost" size="sm" onClick={history.clear}>{t("clearHistory")}</Button>}
      {!recent.available && <p role="status">{t(recent.clearFailed ? "historyClearFailed" : "historyUnavailable")}</p>}
    </section>}
  </section>;
}
