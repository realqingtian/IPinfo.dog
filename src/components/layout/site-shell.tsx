"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Languages, Monitor, Moon, Sun } from "lucide-react";
import logo from "../../../assets/brand/logo.png";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { localeNames, locales, isLocale } from "@/i18n/config";
import { usePreferences } from "@/components/providers/preferences";
import { DataUpdateNotice } from "./data-update-notice";

const subscribe = () => () => {};

function PreferenceMenus() {
  const t = useTranslations("App");
  const { locale, changeLocale } = usePreferences();
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const selection = mounted ? theme ?? "system" : "system";
  const ThemeIcon = selection === "dark" ? Moon : selection === "light" ? Sun : Monitor;
  return <div className="flex items-center gap-2">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" aria-label={`${t("language")}: ${localeNames[locale]}`}>
          <Languages data-icon="inline-start" aria-hidden />
          <span className="hidden sm:inline">{localeNames[locale]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
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
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={selection} onValueChange={(value) => { if (["light", "dark", "system"].includes(value)) setTheme(value); }}>
          <DropdownMenuRadioItem value="light">{t("light")}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">{t("dark")}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">{t("system")}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>;
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("App");
  const pathname = usePathname();
  return <>
    <a href="#main-content" className="sr-only focus:not-sr-only">{t("skipToContent")}</a>
    <header className="border-b">
      <div className="mx-auto grid max-w-[1120px] grid-cols-[1fr_auto] items-center gap-x-5 gap-y-2 px-4 py-3 sm:grid-cols-[auto_1fr_auto] sm:px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="IPinfo.dog" translate="no">
          <Image src={logo} alt="" width={36} height={36} unoptimized priority />
          <span className="text-lg font-semibold tracking-tight">IPinfo.dog</span>
        </Link>
        <nav aria-label={t("navigation")} className="order-3 col-span-2 flex items-center gap-1 sm:order-none sm:col-span-1">
          <Button asChild variant={pathname === "/" ? "secondary" : "ghost"}>
            <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>{t("homeNav")}</Link>
          </Button>
          <Button asChild variant={pathname === "/ip" ? "secondary" : "ghost"}>
            <Link href="/ip" aria-current={pathname === "/ip" ? "page" : undefined}>{t("queryNav")}</Link>
          </Button>
        </nav>
        <PreferenceMenus />
      </div>
    </header>
    <main id="main-content" className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-4 py-6 sm:px-6">
      <DataUpdateNotice />
      {children}
    </main>
  </>;
}
