import { getTranslations } from "next-intl/server";
import { QueryScreen } from "@/features/ip/components/query-screen";
import { Suspense } from "react";

export async function generateMetadata() {
  const t = await getTranslations("App");
  return { title: `${t("queryTitle")} · IPinfo.dog` };
}

export default function IpQueryPage() {
  return <Suspense><QueryScreen /></Suspense>;
}
