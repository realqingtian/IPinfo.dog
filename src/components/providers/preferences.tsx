"use client";

import { Suspense, createContext, useContext, useEffect, useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "next-themes";
import { usePathname, useSearchParams } from "next/navigation";
import { isLocale, localeCookie, type Locale } from "@/i18n/config";
import { readQuery, queryTitle } from "@/features/ip/query";
import { shareImageForLocale } from "@/lib/share-image";
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

function PageMetadata({ locale }: { locale: Locale }) {
  const pathname = usePathname(), search = useSearchParams().toString();
  useEffect(() => {
    document.documentElement.lang = locale;
    const label = pathname === "/" ? messages[locale].App.homeTitle
      : pathname === "/ip" ? messages[locale].App.queryTitle : messages[locale].App.notFoundTitle;
    const title = queryTitle(label, pathname === "/ip" ? readQuery(search).target : null);
    document.title = title;
    const description = pathname === "/" ? messages[locale].App.homeDescription
      : pathname === "/ip" ? messages[locale].App.queryDescription : messages[locale].App.notFoundBody;
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
    // UI language switches intentionally preserve the current result instead of
    // reloading. Keep share metadata in sync as well as the visible page copy.
    const image = shareImageForLocale(locale);
    for (const [attribute, key, content] of [
      ["property", "og:title", title],
      ["property", "og:description", description],
      ["property", "og:image", image],
      ["name", "twitter:title", title],
      ["name", "twitter:description", description],
      ["name", "twitter:image", image],
    ] as const) {
      let meta = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attribute, key);
        document.head.append(meta);
      }
      meta.setAttribute("content", content);
    }
  }, [locale, pathname, search]);
  return null;
}

export function PreferencesProvider({ initialLocale, children }: {
  initialLocale: Locale; children: React.ReactNode;
}) {
  const [locale, setLocale] = useState(initialLocale);

  function changeLocale(next: Locale) {
    if (!isLocale(next)) return;
    setLocale(next);
    try {
      document.cookie = `${localeCookie}=${next}; Path=/; Max-Age=15552000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    } catch { /* The current view still switches when preference storage is unavailable. */ }
  }
  return (
    <LocaleContext.Provider value={{ locale, changeLocale }}>
      <Suspense fallback={null}><PageMetadata locale={locale} /></Suspense>
      <NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone="UTC">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange storageKey="ipinfo-theme">
          {children}
        </ThemeProvider>
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
