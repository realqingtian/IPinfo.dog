"use client";

import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

export function DetectionHelp({ children }: { children: React.ReactNode }) {
  const t = useTranslations("App");
  return <Collapsible className="min-w-0" data-detection-help>
    <CollapsibleTrigger asChild><Button variant="ghost" size="sm">{t("detectionHelp")}<ChevronDown data-icon="inline-end" aria-hidden /></Button></CollapsibleTrigger>
    <CollapsibleContent className="flex flex-col gap-2 px-2 py-3 text-xs leading-5 text-muted-foreground">{children}</CollapsibleContent>
  </Collapsible>;
}
