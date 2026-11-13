import { getTranslations } from "next-intl/server";
import { RoutingScreen } from "@/features/routing/components/routing-screen";
import { configuredRoutingTargets } from "@/server/routing-config";

export async function generateMetadata() {
  const t = await getTranslations("App");
  return { title: `${t("routingTitle")} · IPinfo.dog`, description: t("routingDescription") };
}
export default function RoutingPage() { return <RoutingScreen targets={configuredRoutingTargets()} fixture={Boolean(process.env.IPINFO_ROUTING_FIXTURE_ORIGIN)} />; }
