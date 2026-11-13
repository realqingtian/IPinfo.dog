import { getTranslations } from "next-intl/server";
import { WebRtcScreen } from "@/features/webrtc/components/webrtc-screen";
import { probeUrls } from "@/server/probe-config";

export async function generateMetadata() {
  const t = await getTranslations("App");
  return { title: `${t("rtcTitle")} · IPinfo.dog`, description: t("rtcDescription") };
}
export default function WebRtcPage() { return <WebRtcScreen urls={probeUrls()} />; }
