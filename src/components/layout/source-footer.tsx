"use client";
import { useTranslations } from "next-intl";

export function SourceFooter({ year }: { year: number }) {
  const t = useTranslations("App");
  return <footer className="text-muted-foreground" data-source-footer>
    <div className="mx-auto flex w-full max-w-[1168px] flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-border/60 px-3 py-3 report-meta sm:px-6">
      <p className="shrink-0" translate="no">© {year} <span className="font-medium text-foreground/75">IPinfo.dog</span></p>
      <p>{t("footerDirect")}</p>
    </div>
  </footer>;
}
