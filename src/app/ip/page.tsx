import { getTranslations } from "next-intl/server";
import { QueryScreen } from "@/features/ip/components/query-screen";

export async function generateMetadata() {
  const t = await getTranslations("App");
  return { title: `${t("queryTitle")} · IPinfo.dog` };
}

export default async function IpQueryPage({ searchParams }: {
  searchParams: Promise<{ ip?: string | string[] }>;
}) {
  const params = await searchParams;
  const initialAddress = Array.isArray(params.ip) ? params.ip.join(",") : params.ip ?? "";
  return <QueryScreen initialAddress={initialAddress} />;
}
