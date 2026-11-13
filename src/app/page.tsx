import { getTranslations } from "next-intl/server";
import { HomeScreen } from "@/features/ip/components/home-screen";
import { probeUrls } from "@/server/probe-config";

export async function generateMetadata() {
  const t = await getTranslations("App");
  return { title: `${t("homeTitle")} · IPinfo.dog`, description: t("homeDescription") };
}

export default function Home() {
  return <HomeScreen urls={probeUrls()} />;
}
