import { getTranslations } from "next-intl/server";
import { Ipv6Screen } from "@/features/ipv6/components/ipv6-screen";
import { diagnosticUrls } from "@/server/probe-config";

export async function generateMetadata() {
  const t = await getTranslations("App");
  return { title: `${t("ipv6Title")} · IPinfo.dog`, description: t("ipv6Description") };
}

export default function Ipv6Page() {
  return <Ipv6Screen urls={diagnosticUrls()} />;
}
