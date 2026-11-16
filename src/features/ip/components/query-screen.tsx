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
import { createQueryController, readQuery, queryPath } from "../query";
import { createHistoryStore, historyKey } from "../history";
import { fetchIp } from "../client";
import { IpResultCard, IpResultToolbar } from "./ip-result-card";

export function QueryScreen() {
  const t = useTranslations("App"), search = useSearchParams().toString();
  const input = useRef<HTMLInputElement>(null);
  const [sourceRevision, setSourceRevision] = useState(0);
  const [hidden, setHidden] = useState(false);
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
    setSourceRevision(value => value + 1);
    const path = queryPath(value);
    const selection = readQuery(path.split("?")[1]);
    controller.navigate(selection, true, true);
    if (location.pathname + location.search !== path) window.history.pushState(null, "", path);
    if (selection.error) input.current?.focus();
  }
  const inputError = state.error === "INVALID_IP" || state.error === "NON_PUBLIC_IP";
  const errors = { INVALID_IP: "invalidIp", NON_PUBLIC_IP: "nonPublicIp", NO_RECORD: "noRecord", DATA_UNAVAILABLE: "queryUnavailable", TIMEOUT: "queryTimeout", RATE_LIMITED: "rateLimited" } as const;
  const basic = state.target && !inputError ? { address: state.target, family: state.target.includes(":") ? "ipv6" as const : "ipv4" as const } : null;
  const status = state.phase === "loading" ? "loading" : state.phase === "error" ? "unavailable" : "ready";
  const refresh = () => { setSourceRevision(value => value + 1); controller.navigate(readQuery(search), true, true); };
  return <section className="flex min-w-0 flex-col gap-3">
    <IpResultToolbar result={basic} status={status} title={<h1 className="text-sm font-medium">{t("queryTitle")}</h1>} hidden={hidden} onHiddenChange={setHidden} onRefresh={refresh}>
      <form className="w-full" onSubmit={(event) => { event.preventDefault(); submit(state.draft); }} noValidate>
        <FieldGroup><Field data-invalid={inputError}>
          <FieldLabel className="sr-only" htmlFor="ip-input">{t("inputLabel")}</FieldLabel>
          <InputGroup className="min-h-11 sm:min-h-8">
            <InputGroupInput ref={input} id="ip-input" name="ip" translate="no" value={state.draft} onChange={(event) => controller.setDraft(event.target.value)} placeholder={t("placeholder")} aria-invalid={inputError} aria-describedby={inputError ? "ip-input-error" : undefined} maxLength={128} autoComplete="off" autoCapitalize="none" spellCheck={false} />
            <InputGroupAddon align="inline-end" className="has-[>button]:mr-0"><InputGroupButton type="submit" variant="default" className="min-h-9 sm:min-h-6" aria-busy={state.phase === "loading"}>{state.phase === "loading" ? <Spinner data-icon="inline-start" aria-hidden aria-label={undefined} /> : <Search data-icon="inline-start" aria-hidden />}{t("query")}</InputGroupButton></InputGroupAddon>
          </InputGroup>
          {inputError && state.error && <FieldError id="ip-input-error">{t(errors[state.error])}</FieldError>}
        </Field></FieldGroup>
      </form>
    </IpResultToolbar>
    {state.phase === "error" && !inputError && state.error && <Alert><CircleAlert aria-hidden /><AlertTitle>{t("partialInformation")}</AlertTitle><AlertDescription>
      <p>{t(errors[state.error])}</p>{state.retryAfter && <p>{t("retryAfter", { seconds: state.retryAfter })}</p>}
      {state.retryable && <Button variant="outline" size="sm" onClick={() => controller.navigate(readQuery(search), true, true)}>{t("retry")}</Button>}
    </AlertDescription></Alert>}
    {basic && <IpResultCard key={basic.address} result={state.result ?? basic} status={status} sourceRevision={sourceRevision} showToolbar={false} hidden={hidden} onHiddenChange={setHidden} /> }
    {(recent.items.length > 0 || !recent.available) && <section className="flex w-full flex-col gap-2" aria-label={t("recentQueries")}>
      <div className="flex items-center gap-3"><h2 className="text-sm font-medium">{t("recentQueries")}</h2>{recent.items.length > 0 && <Button variant="ghost" size="sm" onClick={history.clear}>{t("clearHistory")}</Button>}</div>
      <p className="text-xs text-muted-foreground">{t("historyNotice")}</p>
      <div className="flex flex-wrap gap-2">{recent.items.map((address) => <Button key={address} variant="outline" size="sm" className="h-auto min-h-8 max-w-full whitespace-normal break-all text-left" onClick={() => submit(address)}>{address}</Button>)}</div>
      {!recent.available && <p role="status" className="text-sm text-muted-foreground">{t(recent.clearFailed ? "historyClearFailed" : "historyUnavailable")}</p>}
    </section>}
  </section>;
}
