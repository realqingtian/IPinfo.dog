import "server-only";
/** Environment-only overrides permit loopback integration tests, never arbitrary user targets. */
export function probeUrls() {
  return { ipv4: configured(process.env.IPINFO_IPV4_PROBE_URL, "https://v4.ipinfo.dog/api/exit"), ipv6: configured(process.env.IPINFO_IPV6_PROBE_URL, "https://v6.ipinfo.dog/api/exit") };
}
function configured(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  const url = new URL(value);
  if (url.pathname !== "/api/exit" || url.search || url.hash || url.username || url.password || (url.protocol !== "https:" && !(url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname)))) throw new Error("Invalid probe configuration");
  return url.href;
}
