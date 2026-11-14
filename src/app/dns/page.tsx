import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { DnsScreen } from "@/features/dns/components/dns-screen";
export const dynamic = "force-dynamic";
export async function generateMetadata() { const t = await getTranslations("App"); return { title: `${t("dnsTitle")} · IPinfo.dog`, description: t("dnsDescription") }; }
export default function DnsPage() { return <Suspense><DnsScreen /></Suspense>; }
