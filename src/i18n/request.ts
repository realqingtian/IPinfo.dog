import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { chooseLocale, localeCookie } from "./config";
import zhCN from "../../messages/zh-CN.json";
import zhTW from "../../messages/zh-TW.json";
import en from "../../messages/en.json";

const messages = { "zh-CN": zhCN, "zh-TW": zhTW, en };

export default getRequestConfig(async () => {
  const [store, requestHeaders] = await Promise.all([cookies(), headers()]);
  const locale = chooseLocale(store.get(localeCookie)?.value, requestHeaders.get("accept-language") ?? "");
  return { locale, messages: messages[locale], timeZone: "UTC" };
});
