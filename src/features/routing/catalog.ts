export const routingGroups = ["reference", "ai", "social", "tools", "dev", "other"] as const;
export type RoutingGroup = typeof routingGroups[number];
export type RoutingTarget = { id: string; label: string; group: RoutingGroup; href: string; url: string; format: "trace" | "header"; headers?: readonly string[] };
const trace = (id: string, label: string, host: string, group: RoutingGroup): RoutingTarget => ({ id, label, group, href: `https://${host}/`, url: `https://${host}/cdn-cgi/trace`, format: "trace" });

/** Fixed browser destinations only. This is the single identity/order/request catalog. */
export const routingTargets: readonly RoutingTarget[] = [
  { id: "netease", label: "网易", group: "reference", href: "https://www.163.com/", url: "https://necaptcha.nosdn.127.net/ab7f4275c1744aa28e0a8f3a1c58c532.png", format: "header", headers: ["cdn-user-ip"] },
  { id: "bytedance", label: "字节跳动", group: "reference", href: "https://www.bytedance.com/", url: "https://perfops.byte-test.com/500b-bench.jpg", format: "header", headers: ["x-request-ip"] },
  trace("cloudflare-cn", "Cloudflare 中国", "www.cloudflare-cn.com", "reference"),
  trace("qualcomm-cn", "高通中国", "www.qualcomm.cn", "reference"),
  trace("chatgpt", "ChatGPT", "chatgpt.com", "ai"),
  trace("openai", "OpenAI", "openai.com", "ai"),
  trace("claude", "Claude", "claude.ai", "ai"),
  trace("anthropic", "Anthropic", "anthropic.com", "ai"),
  trace("grok", "Grok", "grok.com", "ai"),
  trace("perplexity", "Perplexity", "www.perplexity.ai", "ai"),
  trace("midjourney", "Midjourney", "midjourney.com", "ai"),
  trace("discord", "Discord", "gateway.discord.gg", "social"),
  trace("x", "X", "x.com", "social"),
  trace("medium", "Medium", "medium.com", "social"),
  trace("signal", "Signal", "signal.org", "social"),
  trace("notion", "Notion", "notion.so", "tools"),
  trace("poe", "Poe", "poe.com", "tools"),
  trace("zoom", "Zoom", "zoom.us", "tools"),
  trace("shopify", "Shopify", "shopify.com", "tools"),
  trace("cloudflare", "Cloudflare", "www.cloudflare.com", "dev"),
  trace("npm", "npm", "registry.npmjs.org", "dev"),
  trace("gitlab", "GitLab", "gitlab.com", "dev"),
  trace("unpkg", "unpkg", "unpkg.com", "dev"),
  trace("nodejs", "Node.js", "nodejs.org", "dev"),
  trace("coinbase", "Coinbase", "coinbase.com", "other"),
  trace("okx", "OKX", "www.okx.com", "other"),
  trace("crypto", "Crypto.com", "crypto.com", "other"),
  trace("crunchyroll", "Crunchyroll", "crunchyroll.com", "other"),
];
