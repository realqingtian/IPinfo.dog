"use client";
import { useTranslations } from "next-intl";
import { sourceLinks } from "@/lib/contracts/ip-sources";

export function SourceFooter({ year }: { year: number }) {
  const t = useTranslations("Sources");
  const link = "underline-offset-4 hover:text-foreground hover:underline";
  return <footer className="border-t text-xs leading-5 text-muted-foreground">
    <div className="mx-auto flex w-full max-w-[1168px] flex-col gap-1 px-3 py-4 sm:px-6">
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span>{t("dataSources")}</span>
        <a href={sourceLinks.maxmind} className={link} target="_blank" rel="noreferrer">MaxMind</a>
        <span><a href={sourceLinks.dbip} className={link} target="_blank" rel="noreferrer">DB-IP Lite</a> · <a href="https://creativecommons.org/licenses/by/4.0/" className={link} target="_blank" rel="noreferrer">CC BY 4.0</a></span>
        <span><a href={sourceLinks.ipinfo} className={link} target="_blank" rel="noreferrer">IPinfo Lite</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" className={link} target="_blank" rel="noreferrer">CC BY-SA 4.0</a></span>
        <span>{t("exitSource")} <a href="https://www.ipify.org/" className={link} target="_blank" rel="noreferrer">ipify</a> · <a href="https://api.ident.me/" className={link} target="_blank" rel="noreferrer">ident.me</a></span>
        <span>{t("iconSource")} <a href="https://duckduckgo.com/duckduckgo-help-pages/privacy/favicons" className={link} target="_blank" rel="noreferrer">DuckDuckGo</a></span>
      </p>
      <p>{t("footerNotice")}</p>
      <p className="mt-2" translate="no">© {year} IPinfo.dog</p>
    </div>
  </footer>;
}
