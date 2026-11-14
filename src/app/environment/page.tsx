import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { EnvironmentScreen } from "@/features/environment/components/environment-screen";
import { requestView } from "@/features/environment/environment";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getTranslations("App");
  return { title: `${t("envTitle")} · IPinfo.dog`, description: t("envDescription") };
}
export default async function EnvironmentPage() {
  return <EnvironmentScreen requestHeaders={requestView(await headers())} />;
}
