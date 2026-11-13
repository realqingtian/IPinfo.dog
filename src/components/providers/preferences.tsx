"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "next-themes";
import { usePathname } from "next/navigation";
import { isLocale, localeCookie, type Locale } from "@/i18n/config";
import zhCN from "../../../messages/zh-CN.json";
import zhTW from "../../../messages/zh-TW.json";
import en from "../../../messages/en.json";

const messages = { "zh-CN": zhCN, "zh-TW": zhTW, en };
const LocaleContext = createContext<{ locale: Locale; changeLocale: (locale: Locale) => void } | null>(null);

export function usePreferences() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("Preferences provider is missing");
  return context;
}

export function PreferencesProvider({ initialLocale, children }: {
  initialLocale: Locale; children: React.ReactNode;
}) {
  const [locale, setLocale] = useState(initialLocale);
  const pathname = usePathname();
  function changeLocale(next: Locale) {
    if (!isLocale(next)) return;
    setLocale(next);
    try {
      document.cookie = `${localeCookie}=${next}; Path=/; Max-Age=15552000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    } catch { /* The current view still switches when preference storage is unavailable. */ }
  }
  useEffect(() => {
    document.documentElement.lang = locale;
    const title = pathname === "/" ? messages[locale].App.homeTitle
      : pathname === "/ip" ? messages[locale].App.queryTitle : pathname === "/ipv6" ? messages[locale].App.ipv6Title : messages[locale].App.notFoundTitle;
    document.title = `${title} · IPinfo.dog`;
    const description = pathname === "/" ? messages[locale].App.homeDescription
      : pathname === "/ip" ? messages[locale].App.queryDescription : pathname === "/ipv6" ? messages[locale].App.ipv6Description : messages[locale].App.notFoundBody;
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
  }, [locale, pathname]);
  return (
    <LocaleContext.Provider value={{ locale, changeLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone="UTC">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange storageKey="ipinfo-theme">
          {children}
        </ThemeProvider>
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
