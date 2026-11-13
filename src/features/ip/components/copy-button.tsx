"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Check, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { attemptCopy } from "../clipboard";

export function CopyButton({ value, label }: { value: string | (() => string); label: string }) {
  const t = useTranslations("App");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const description = status === "success" ? t("copied") : status === "error" ? t("copyFailed") : label;
  return <span className="inline-flex items-center">
    <Button variant="ghost" size="icon" aria-label={label} title={description} onClick={async () => {
      setStatus(await attemptCopy(value, (text) => navigator.clipboard.writeText(text)));
    }}>
      {status === "success" ? <Check aria-hidden /> : status === "error" ? <CircleAlert aria-hidden /> : <Copy aria-hidden />}
    </Button>
    <span className="sr-only" role="status">{status === "idle" ? "" : description}</span>
  </span>;
}
