"use client";
import { useTranslations } from "next-intl";
import { sourceLinks } from "@/lib/contracts/ip-sources";

export function SourceFooter({ year }: { year: number }) {
  const t = useTranslations("Sources");
  const link = "underline-offset-4 hover:text-foreground hover:underline";
  const separator = <span aria-hidden="true">·</span>;
  return <footer className="border-t text-[11px] leading-5 text-muted-foreground" data-source-footer>
    <div className="mx-auto max-w-[1168px] overflow-x-auto" tabIndex={0} role="region" aria-label={t("footerLabel")}>
      <p className="flex w-max min-w-full items-center gap-2 whitespace-nowrap px-3 py-2 sm:px-6">
        <span translate="no">© {year} IPinfo.dog</span>{separator}
        <a href={sourceLinks.maxmind} className={link} target="_blank" rel="noreferrer">MaxMind</a>{separator}
        <span><a href={sourceLinks.dbip} className={link} target="_blank" rel="noreferrer">DB-IP</a> <a href="https://creativecommons.org/licenses/by/4.0/" className={link} target="_blank" rel="noreferrer" aria-label="Creative Commons Attribution 4.0">BY 4.0</a></span>{separator}
        <span><a href={sourceLinks.ipinfo} className={link} target="_blank" rel="noreferrer" title={t("ipinfoNotice")} aria-label={`IPinfo · ${t("ipinfoNotice")}`}>IPinfo</a> <a href="https://creativecommons.org/licenses/by-sa/4.0/" className={link} target="_blank" rel="noreferrer" aria-label="Creative Commons Attribution-ShareAlike 4.0">BY-SA 4.0</a></span>{separator}
        <a href="https://www.ipify.org/" className={link} target="_blank" rel="noreferrer">ipify</a>
        <a href="https://api.ident.me/" className={link} target="_blank" rel="noreferrer">ident.me</a>{separator}
        <a href="https://duckduckgo.com/duckduckgo-help-pages/privacy/favicons" className={link} target="_blank" rel="noreferrer" title={t("iconNotice")} aria-label={`DuckDuckGo · ${t("iconNotice")}`}>DDG</a>{separator}
        <span>{t("footerNotice")}</span>
      </p>
    </div>
  </footer>;
}
