"use client";
import { useTranslations } from "next-intl";

export function SourceFooter({ year }: { year: number }) {
  const t = useTranslations("App");
  return <footer className="text-muted-foreground" data-source-footer>
    <div className="site-footer">
      <p className="shrink-0" translate="no">© {year} <span className="font-medium text-foreground/75">IPinfo.dog</span></p>
      <p>{t("footerDirect")}</p>
    </div>
  </footer>;
}
