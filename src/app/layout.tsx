import type { Metadata } from "next";
import "./globals.css";
import { getLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { PreferencesProvider } from "@/components/providers/preferences";
import { SiteShell } from "@/components/layout/site-shell";
import { shareImage } from "@/lib/share-image";
const baseMetadata: Metadata = {
  title: "IPinfo.dog",
  description: "IP 查询与网络出口信息",
  metadataBase: new URL("https://ipinfo.dog"),
  manifest: "/site-v3.webmanifest",
  openGraph: {
    type: "website",
    siteName: "IPinfo.dog",
  },
  icons: {
    icon: [
      { url: "/favicon-v3.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      ...[16, 32, 48, 192, 512].map(size => ({ url: `/icons/icon-${size}-v3.png`, sizes: `${size}x${size}`, type: "image/png" })),
    ],
    apple: [180, 167, 152].map(size => ({ url: `/icons/apple-touch-icon-${size}-v3.png`, sizes: `${size}x${size}`, type: "image/png" })),
  },
  robots: { index: false, follow: false },
};

export function generateMetadata(): Metadata {
  return {
    ...baseMetadata,
    openGraph: {
      ...baseMetadata.openGraph,
      images: [{ url: shareImage, width: 1200, height: 630, type: "image/png", alt: "IPinfo.dog" }],
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const requested = await getLocale();
  const locale = isLocale(requested) ? requested : "en";
  return (
    <html lang={locale} suppressHydrationWarning>
      <body><PreferencesProvider initialLocale={locale}><SiteShell>{children}</SiteShell></PreferencesProvider></body>
    </html>
  );
}
