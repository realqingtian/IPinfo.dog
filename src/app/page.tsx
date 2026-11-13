import { getTranslations } from "next-intl/server";
import { HomeScreen } from "@/features/ip/components/home-screen";

export async function generateMetadata() {
  const t = await getTranslations("App");
  return { title: `${t("homeTitle")} · IPinfo.dog` };
}

export default function Home() {
  return <HomeScreen />;
}
