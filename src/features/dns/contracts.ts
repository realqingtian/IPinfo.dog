export const dnsTypes = { A: 1, AAAA: 28, CNAME: 5, MX: 15, TXT: 16, NS: 2, CAA: 257, HTTPS: 65 } as const;
export type DnsType = keyof typeof dnsTypes;
export const dnsResolvers = [
  { id: "alidns", name: "AliDNS", website: "https://www.alidns.com/" },
  { id: "cloudflare", name: "Cloudflare", website: "https://one.one.one.one/" },
  { id: "google", name: "Google", website: "https://developers.google.com/speed/public-dns" },
] as const;
export type ResolverId = (typeof dnsResolvers)[number]["id"];
export type DnsRecord = { name: string; type: number; ttl: number; data: string };
export type DnsStatus = "ok" | "empty" | "nxdomain" | "servfail" | "refused" | "dns-error" | "timeout" | "unavailable" | "invalid-response" | "limited" | "cancelled";
export type DnsResult = { resolver: ResolverId; name: string; type: DnsType; status: DnsStatus; records: DnsRecord[]; elapsedMs: number; rcode?: number; authenticated?: boolean };
export type DnsSelection = { name: string; type: DnsType };
export function isDnsType(value: string): value is DnsType { return Object.hasOwn(dnsTypes, value); }
export function isResolver(value: string): value is ResolverId { return dnsResolvers.some(x => x.id === value); }
export function recordType(value: number) { return Object.entries(dnsTypes).find(([, number]) => value === number)?.[0] ?? `TYPE${value}`; }
export function dnsPath(selection: DnsSelection) { return `/dns?${new URLSearchParams(selection)}`; }
export function normalizeDnsName(input: string): string {
  if (input.length > 1024 || /[\s/:@?#%\\\[\]\x00-\x1f\x7f]/.test(input.trim())) throw new Error("INVALID_DNS");
  const name = new URL(`https://${input.trim().replace(/\.$/, "")}`).hostname.toLowerCase();
  const labels = name.split(".");
  if (!name || name.length > 253 || labels.length < 2 || labels.some(x => !/^[a-z0-9_](?:[a-z0-9_-]{0,61}[a-z0-9_])?$/.test(x)) || !/^(?:[a-z]{2,63}|xn--[a-z0-9-]+)$/.test(labels.at(-1)!)) throw new Error("INVALID_DNS");
  if (/(?:^|\.)(?:localhost|local|internal|invalid|test|onion)$/.test(name)) throw new Error("INVALID_DNS");
  return name;
}
