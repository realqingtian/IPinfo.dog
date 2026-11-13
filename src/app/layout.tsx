import type { Metadata } from "next";
import logo from "../../assets/brand/logo.png";
import "./globals.css";
import { getLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { PreferencesProvider } from "@/components/providers/preferences";
import { SiteShell } from "@/components/layout/site-shell";
export const metadata: Metadata = {
  title: "IPinfo.dog",
  description: "IP 查询与网络出口信息",
  icons: { icon: logo.src },
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const requested = await getLocale();
  const locale = isLocale(requested) ? requested : "en";
  return (
    <html lang={locale} suppressHydrationWarning>
      <body><PreferencesProvider initialLocale={locale}><SiteShell>{children}</SiteShell></PreferencesProvider></body>
    </html>
  );
}
