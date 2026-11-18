"use client";
import { useRef, useState, useTransition, type Ref } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import { InputGroup, InputGroupInput, InputGroupAddon, InputGroupButton } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { readQuery, queryPath } from "../query";

export function IpSearchForm({ value, onChange, onSubmit, inputRef, error, busy = false }: {
  value: string; onChange: (value: string) => void; onSubmit: (value: string) => void;
  inputRef?: Ref<HTMLInputElement>; error?: string | null; busy?: boolean;
}) {
  const t = useTranslations("App");
  return <form role="search" action="/ip" method="get" className="query-search" onSubmit={event => { event.preventDefault(); onSubmit(value); }} noValidate>
    <FieldGroup><Field data-invalid={Boolean(error)}>
      <FieldLabel className="sr-only" htmlFor="ip-input">{t("inputLabel")}</FieldLabel>
      <InputGroup className="query-input">
        <InputGroupInput ref={inputRef} id="ip-input" name="ip" enterKeyHint="search" translate="no" value={value} onChange={event => onChange(event.target.value)} placeholder="IPv4 / IPv6" aria-description={t("placeholder")} title={t("placeholder")} aria-invalid={Boolean(error)} aria-describedby={error ? "ip-input-error" : undefined} maxLength={128} autoComplete="off" autoCapitalize="none" spellCheck={false} />
        <InputGroupAddon align="inline-end" className="has-[>button]:mr-0"><InputGroupButton type="submit" variant="default" className="min-h-9 rounded-full px-3 sm:min-h-7" aria-busy={busy}>{busy ? <Spinner data-icon="inline-start" aria-hidden aria-label={undefined} /> : <Search data-icon="inline-start" aria-hidden />}{t("query")}</InputGroupButton></InputGroupAddon>
      </InputGroup>
      <div className="query-validation">{error && <FieldError id="ip-input-error">{error}</FieldError>}</div>
    </Field></FieldGroup>
  </form>;
}

/** Homepage search validates locally, then opens the existing target report route. */
export function HomeIpSearch() {
  const t = useTranslations("App"), router = useRouter(), input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(""), [error, setError] = useState<"INVALID_IP" | "NON_PUBLIC_IP" | null>(null);
  const [pending, startTransition] = useTransition();
  function submit(value: string) {
    const path = queryPath(value), selection = readQuery(path.split("?")[1]);
    if (selection.error === "INVALID_IP" || selection.error === "NON_PUBLIC_IP") {
      setError(selection.error);
      input.current?.focus();
      return;
    }
    setError(null);
    startTransition(() => router.push(path));
  }
  return <IpSearchForm value={value} inputRef={input} onChange={value => { setValue(value); setError(null); }} onSubmit={submit}
    error={error ? t(error === "INVALID_IP" ? "invalidIp" : "nonPublicIp") : null} busy={pending} />;
}
