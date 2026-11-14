"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, ChevronDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FieldGroup, Field, FieldLabel, FieldError } from "@/components/ui/field";
import { InputGroup, InputGroupInput, InputGroupAddon, InputGroupButton } from "@/components/ui/input-group";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { DetectionHelp } from "@/components/layout/detection-help";
import { CopyButton } from "@/features/ip/components/copy-button";
import { createDnsController, readDnsQuery } from "../controller";
import { dnsResolvers, dnsTypes, dnsPath, isDnsType, recordType } from "../contracts";
import { fetchDns } from "../client";

export function DnsScreen() {
  const t = useTranslations("App"), search = useSearchParams().toString(), input = useRef<HTMLInputElement>(null);
  const [controller] = useState(() => createDnsController(fetchDns, readDnsQuery(search)));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getServerSnapshot);
  useEffect(() => { controller.navigate(search); }, [controller, search]);
  useEffect(() => () => controller.dispose(), [controller]);
  const loading = Object.values(state.rows).some(x => x?.phase === "loading");
  function submit() {
    const path = dnsPath({ name: state.draft.trim(), type: state.type }), query = path.split("?")[1];
    controller.navigate(query, true);
    if (location.pathname + location.search !== path) window.history.pushState(null, "", path);
    if (readDnsQuery(query).invalid) input.current?.focus();
  }
  return <section className="flex min-w-0 flex-col gap-5" data-dns="lookup">
    <div className="flex flex-col gap-1"><h1 className="text-xl font-semibold tracking-tight">{t("dnsTitle")}</h1><p className="text-sm text-muted-foreground">{t("dnsDescription")}</p></div>
    <form noValidate onSubmit={event => { event.preventDefault(); submit(); }}>
      <FieldGroup className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Field data-invalid={state.invalid}><FieldLabel htmlFor="dns-name">{t("dnsDomain")}</FieldLabel>
          <InputGroup><InputGroupInput ref={input} id="dns-name" value={state.draft} onChange={event => controller.setDraft(event.target.value)} translate="no" placeholder="example.com" maxLength={1024} autoComplete="off" autoCapitalize="none" spellCheck={false} aria-invalid={state.invalid} aria-describedby={state.invalid ? "dns-name-error" : undefined} />
            <InputGroupAddon align="inline-end"><InputGroupButton type="submit" variant="default"><Search data-icon="inline-start" aria-hidden />{t("query")}</InputGroupButton></InputGroupAddon></InputGroup>
          {state.invalid && <FieldError id="dns-name-error">{t("dnsInvalid")}</FieldError>}
        </Field>
        <Field><FieldLabel htmlFor="dns-type">{t("dnsType")}</FieldLabel><DropdownMenu><DropdownMenuTrigger asChild><Button id="dns-type" variant="outline" type="button" aria-label={`${t("dnsType")}: ${state.type}`}>{state.type}<ChevronDown data-icon="inline-end" aria-hidden /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end"><DropdownMenuRadioGroup value={state.type} onValueChange={type => { if (isDnsType(type)) controller.setType(type); }}>{Object.keys(dnsTypes).map(type => <DropdownMenuRadioItem key={type} value={type}>{type}</DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuContent>
        </DropdownMenu></Field>
      </FieldGroup>
    </form>
    <p className="text-xs text-muted-foreground">{t("dnsPrivacy")}</p>
    {state.target && <>
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="min-w-0 break-all text-sm font-medium" translate="no">{state.target.name} · {state.target.type}</h2><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={controller.cancel} disabled={!loading}>{t("dnsCancel")}</Button><CopyButton label={t("copyLink")} value={() => new URL(dnsPath(state.target!), location.origin).href} /></div></div>
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-3">{dnsResolvers.map(resolver => {
        const row = state.rows[resolver.id], result = row?.result;
        return <Card key={resolver.id} className="min-w-0" role="region" aria-label={resolver.name} data-dns-resolver={resolver.id}>
          <CardHeader><div className="flex items-center justify-between gap-2"><CardTitle><a href={resolver.website} target="_blank" rel="noreferrer">{resolver.name}</a></CardTitle><Button variant="ghost" size="icon" onClick={() => controller.retry(resolver.id)} aria-label={t("dnsRetry", { name: resolver.name })}><RefreshCw aria-hidden /></Button></div></CardHeader>
          <CardContent className="flex min-w-0 flex-col gap-3">
            <div role="status" aria-live="polite" className="flex flex-wrap items-center gap-2">{row?.phase === "loading" ? <><Spinner aria-hidden /><span>{t("dnsLoading")}</span></> : result && <><Badge variant="secondary">{t(`dnsStatus_${result.status}`)}</Badge><span className="text-xs text-muted-foreground">{result.elapsedMs} ms</span></>}</div>
            {result && <>
              {result.records.map((record, index) => <dl key={index} className="flex min-w-0 flex-col gap-1 rounded-md border p-3" data-dns-record="true">
                <div className="flex flex-wrap items-center justify-between gap-2"><dt className="text-xs text-muted-foreground" translate="no">{recordType(record.type)}</dt><dd className="text-xs text-muted-foreground">TTL {record.ttl} s</dd></div>
                <dt className="break-all text-xs text-muted-foreground" translate="no">{record.name}</dt><dd className="min-w-0 whitespace-pre-wrap break-all text-sm" translate="no">{record.data}</dd>
              </dl>)}
              {result.status === "ok" && <CopyButton label={t("dnsCopy", { name: resolver.name })} value={JSON.stringify(result.records, null, 2)} />}
              {result.rcode !== undefined && <p className="text-xs text-muted-foreground" translate="no">RCODE {result.rcode}</p>}
            </>}
          </CardContent>
        </Card>;
      })}</div>
    </>}
    {!state.target && !state.invalid && <p role="status" className="text-sm text-muted-foreground">{t("dnsIdle")}</p>}
    <DetectionHelp><p>{t("dnsHelp")}</p><p>{t("dnsTiming")}</p><p>{t("dnsNoHistory")}</p></DetectionHelp>
  </section>;
}
