"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import { InputGroup, InputGroupInput, InputGroupAddon, InputGroupButton } from "@/components/ui/input-group";
import { demoAddresses, previewState, type PreviewState } from "../demo";
import { IpResultCard } from "./ip-result-card";
import { CopyButton } from "./copy-button";

export function QueryScreen({ initialAddress }: { initialAddress: string }) {
  const t = useTranslations("App");
  const [input, setInput] = useState(initialAddress);
  const [preview, setPreview] = useState<PreviewState>(() => previewState(initialAddress));
  const result = preview.result;
  function show(value: string) {
    const next = value.trim() ? previewState(value) : { result: null, error: "invalidIp" as const };
    setPreview(next);
    if (next.result) {
      const url = new URL("/ip", location.origin);
      url.searchParams.set("ip", next.result.address);
      window.history.replaceState(window.history.state, "", url.pathname + url.search);
    }
  }
  return <section className="flex min-w-0 flex-col gap-5">
    <div className="flex flex-col gap-1">
      <h1 className="text-xl font-semibold tracking-tight">{t("queryTitle")}</h1>
      <p className="text-sm text-muted-foreground">{t("queryDescription")}</p>
    </div>
    <form className="max-w-3xl" onSubmit={(event) => { event.preventDefault(); show(input); }} noValidate>
      <FieldGroup>
        <Field data-invalid={!!preview.error}>
          <FieldLabel htmlFor="ip-input">{t("inputLabel")}</FieldLabel>
          <InputGroup>
            <InputGroupInput id="ip-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder={t("placeholder")} aria-invalid={!!preview.error} aria-describedby={preview.error ? "ip-input-error" : undefined} maxLength={128} autoComplete="off" autoCapitalize="none" spellCheck={false} />
            <InputGroupAddon align="inline-end">
              <InputGroupButton type="submit" variant="default"><Search data-icon="inline-start" aria-hidden />{t("preview")}</InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {preview.error && <FieldError id="ip-input-error" role="alert">{t(preview.error)}</FieldError>}
        </Field>
      </FieldGroup>
    </form>
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">{t("examples")}</span>
      {demoAddresses.map((address, index) => <Button key={address} variant="outline" size="sm" onClick={() => { setInput(address); show(address); }}>{index === 0 ? "IPv4" : "IPv6"} {t("sample")}</Button>)}
    </div>
    {result ? <div className="flex w-full max-w-3xl flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">{t("queryResult")}</h2>
        <CopyButton label={t("copyLink")} value={() => {
          const url = new URL("/ip", location.origin);
          url.searchParams.set("ip", result.address);
          return url.href;
        }} />
      </div>
      <IpResultCard key={result.address} result={result} />
    </div> : !preview.error && <p className="text-sm text-muted-foreground">{t("emptyQuery")}</p>}
  </section>;
}
