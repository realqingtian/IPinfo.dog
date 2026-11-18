"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Languages, Monitor, Moon, Sun } from "lucide-react";
import logo from "../../../assets/brand/header-logo.webp";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { localeNames, locales, isLocale } from "@/i18n/config";
import { usePreferences } from "@/components/providers/preferences";
import { DataUpdateNotice } from "./data-update-notice";
import { SourceFooter } from "./source-footer";
import { HomeIpSearch } from "@/features/ip/components/ip-search-form";
import { ReportNavigationProvider, useReportNavigation } from "@/features/ip/components/report-navigation";
import { queryPath } from "@/features/ip/query";

const subscribe = () => () => {};

function PreferenceMenus() {
  const t = useTranslations("App");
  const { locale, changeLocale } = usePreferences();
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const selection = mounted ? theme ?? "system" : "system";
  const ThemeIcon = selection === "dark" ? Moon : selection === "light" ? Sun : Monitor;
  return <div className="site-preferences">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" aria-label={`${t("language")}: ${localeNames[locale]}`}>
          <Languages data-icon="inline-start" aria-hidden />
          <span className="hidden md:inline">{localeNames[locale]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="preference-menu">
        <DropdownMenuRadioGroup value={locale} onValueChange={(value) => { if (isLocale(value)) changeLocale(value); }}>
          {locales.map((value) => <DropdownMenuRadioItem key={value} value={value}>{localeNames[value]}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("theme")} title={t("theme")}>
          <ThemeIcon aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="preference-menu">
        <DropdownMenuRadioGroup value={selection} onValueChange={(value) => { if (["light", "dark", "system"].includes(value)) setTheme(value); }}>
          <DropdownMenuRadioItem value="light">{t("light")}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">{t("dark")}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">{t("system")}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>;
}

export function SiteShell({ children, year }: { children: React.ReactNode; year: number }) {
  return <ReportNavigationProvider><SiteShellContent year={year}>{children}</SiteShellContent></ReportNavigationProvider>;
}

function SiteShellContent({ children, year }: { children: React.ReactNode; year: number }) {
  const t = useTranslations("App");
  const pathname = usePathname();
  const { address } = useReportNavigation();
  const queryHref = pathname === "/ip" ? "#main-content" : address ? queryPath(address) : "/ip";
  return <>
    <a href="#main-content" className="sr-only focus:not-sr-only">{t("skipToContent")}</a>
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" prefetch={true} className="site-brand" aria-label="IPinfo.dog" translate="no">
          <Image src={logo} alt="" width={36} height={36} unoptimized priority />
          <span>IPinfo.dog</span>
        </Link>
        <nav aria-label={t("navigation")} className="site-nav">
          <Link href="/" prefetch={true} aria-current={pathname === "/" ? "page" : undefined}>{t("homeNav")}</Link>
          <Link href={queryHref} prefetch={pathname !== "/ip"} onClick={pathname === "/ip" ? event => event.preventDefault() : undefined} aria-current={pathname === "/ip" ? "page" : undefined}>{t("queryNav")}</Link>
          <Link href="/split" prefetch={true} aria-current={pathname === "/split" ? "page" : undefined}>{t("splitNav")}</Link>
        </nav>
        <div id="query-search-slot" className="query-search-slot">{pathname !== "/ip" && <HomeIpSearch />}</div>
        <PreferenceMenus />
      </div>
    </header>
    <main id="main-content" className="site-main">
      <DataUpdateNotice />
      {children}
    </main>
    <SourceFooter year={year} />
  </>;
}
