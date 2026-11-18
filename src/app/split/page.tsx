import { getTranslations } from "next-intl/server";
import { RoutingScreen } from "@/features/routing/screen";

export async function generateMetadata() {
  const t = await getTranslations("Routing");
  return { title: `${t("title")} · IPinfo.dog`, description: t("description") };
}
export default function SplitPage() { return <RoutingScreen />; }
