"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const t = useTranslations("App");
  return <section className="flex flex-col items-start gap-3">
    <h1 className="text-xl font-semibold">{t("notFoundTitle")}</h1>
    <p className="text-sm text-muted-foreground">{t("notFoundBody")}</p>
    <Button asChild variant="outline"><Link href="/">{t("goHome")}</Link></Button>
  </section>;
}
