"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import { InputGroup, InputGroupInput, InputGroupAddon, InputGroupButton } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { createQueryController, readQuery, queryPath } from "../query";
import { createHistoryStore, historyKey } from "../history";
import { fetchIp } from "../client";
import { IpResultCard } from "./ip-result-card";
import { CopyButton } from "./copy-button";

export function QueryScreen() {
  const t = useTranslations("App"), search = useSearchParams().toString();
  const input = useRef<HTMLInputElement>(null);
  const [history] = useState(() => createHistoryStore(() => localStorage));
  const [controller] = useState(() => createQueryController({ initial: readQuery(search), lookup: fetchIp, onSuccess: history.record }));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getServerSnapshot);
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
    controller.navigate(selection, true, true);
    if (location.pathname + location.search !== path) window.history.pushState(null, "", path);
    if (selection.error) input.current?.focus();
  }
  const inputError = state.error === "INVALID_IP" || state.error === "NON_PUBLIC_IP";
  const errors = { INVALID_IP: "invalidIp", NON_PUBLIC_IP: "nonPublicIp", NO_RECORD: "noRecord", DATA_UNAVAILABLE: "queryUnavailable", TIMEOUT: "queryTimeout", RATE_LIMITED: "rateLimited" } as const;
  return <section className="flex min-w-0 flex-col gap-5">
    <div className="flex flex-col gap-1"><h1 className="text-xl font-semibold tracking-tight">{t("queryTitle")}</h1><p className="text-sm text-muted-foreground">{t("queryDescription")}</p></div>
    <form className="max-w-3xl" onSubmit={(event) => { event.preventDefault(); submit(state.draft); }} noValidate>
      <FieldGroup><Field data-invalid={inputError}>
        <FieldLabel htmlFor="ip-input">{t("inputLabel")}</FieldLabel>
        <InputGroup>
          <InputGroupInput ref={input} id="ip-input" name="ip" translate="no" value={state.draft} onChange={(event) => controller.setDraft(event.target.value)} placeholder={t("placeholder")} aria-invalid={inputError} aria-describedby={inputError ? "ip-input-error" : undefined} maxLength={128} autoComplete="off" autoCapitalize="none" spellCheck={false} />
          <InputGroupAddon align="inline-end"><InputGroupButton type="submit" variant="default"><Search data-icon="inline-start" aria-hidden />{t("query")}</InputGroupButton></InputGroupAddon>
        </InputGroup>
        {inputError && state.error && <FieldError id="ip-input-error">{t(errors[state.error])}</FieldError>}
      </Field></FieldGroup>
    </form>
    <section className="flex max-w-3xl flex-col gap-2" aria-label={t("recentQueries")}>
      <div className="flex items-center gap-3"><h2 className="text-sm font-medium">{t("recentQueries")}</h2>{recent.items.length > 0 && <Button variant="ghost" size="sm" onClick={history.clear}>{t("clearHistory")}</Button>}</div>
      <p className="text-xs text-muted-foreground">{t("historyNotice")}</p>
      <div className="flex flex-wrap gap-2">{recent.items.map((address) => <Button key={address} variant="outline" size="sm" className="h-auto min-h-8 max-w-full whitespace-normal break-all text-left" onClick={() => submit(address)}>{address}</Button>)}</div>
      {!recent.available && <p role="status" className="text-sm text-muted-foreground">{t(recent.clearFailed ? "historyClearFailed" : "historyUnavailable")}</p>}
    </section>
    {state.phase === "idle" && <p className="text-sm text-muted-foreground">{t("emptyQuery")}</p>}
    {state.phase === "loading" && <div className="flex max-w-3xl flex-col gap-3" role="status" aria-live="polite"><p className="flex min-w-0 items-center gap-2 text-sm"><Spinner aria-hidden /><span className="break-all">{t("querying", { address: state.target ?? "" })}</span></p><Skeleton className="h-60 w-full" /></div>}
    {state.phase === "error" && !inputError && state.error && <Alert className="max-w-3xl"><CircleAlert aria-hidden /><AlertTitle>{t("queryFailed")}</AlertTitle><AlertDescription>
      <p>{t(errors[state.error])}</p>{state.retryAfter && <p>{t("retryAfter", { seconds: state.retryAfter })}</p>}
      {state.retryable && <Button variant="outline" size="sm" onClick={() => controller.navigate(readQuery(search), true, true)}>{t("retry")}</Button>}
    </AlertDescription></Alert>}
    {state.result && <div className="flex w-full max-w-3xl flex-col gap-3" aria-live="polite">
      <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-medium">{t("queryResult")}</h2><CopyButton label={t("copyLink")} value={() => new URL(queryPath(state.result!.address), location.origin).href} /></div>
      <IpResultCard key={state.result.address} result={state.result} onRefresh={() => controller.navigate(readQuery(search), true, true)} />
      <p className="text-xs leading-5 text-muted-foreground">{t("geoDisclaimer")} <a href="https://www.maxmind.com" target="_blank" rel="noreferrer" className="underline underline-offset-4">MaxMind GeoLite2</a></p>
    </div>}
  </section>;
}
