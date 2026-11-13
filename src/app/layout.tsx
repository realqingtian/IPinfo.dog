import type { Metadata } from "next";
import logo from "../../assets/brand/logo.png";
import "./globals.css";
export const metadata: Metadata = {
  title: "IPinfo.dog",
  description: "IP 查询与网络出口信息",
  icons: { icon: logo.src },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
