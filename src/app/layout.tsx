import type { Metadata } from "next";
import "./globals.css";
import { getLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { PreferencesProvider } from "@/components/providers/preferences";
import { SiteShell } from "@/components/layout/site-shell";
export const metadata: Metadata = {
  title: "IPinfo.dog",
  description: "IP 查询与网络出口信息",
  manifest: "/site-v2.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", sizes: "32x32 48x48", type: "image/x-icon" },
      ...[32, 48, 192, 512].map(size => ({ url: `/icons/icon-${size}-v2.png`, sizes: `${size}x${size}`, type: "image/png" })),
    ],
    apple: [180, 167, 152].map(size => ({ url: `/icons/apple-touch-icon-${size}-v2.png`, sizes: `${size}x${size}`, type: "image/png" })),
  },
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
