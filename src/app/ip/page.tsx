import { getTranslations } from "next-intl/server";
import { QueryScreen } from "@/features/ip/components/query-screen";
import { Suspense } from "react";

import { readQuery, queryTitle } from "@/features/ip/query";

export async function generateMetadata({ searchParams }: PageProps<"/ip">) {
  const params = new URLSearchParams();
  for (const [key, values] of Object.entries(await searchParams)) {
    for (const value of Array.isArray(values) ? values : [values]) {
      if (value !== undefined) params.append(key, value);
    }
  }
  const t = await getTranslations("App");
  return { title: queryTitle(t("queryTitle"), readQuery(params.toString()).target), description: t("queryDescription") };
}

export default function IpQueryPage() {
  return <Suspense><QueryScreen /></Suspense>;
}
