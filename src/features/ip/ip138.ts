import { parseIp } from "../../lib/ip.ts";
import { readEchoGeography } from "./echo-geography.ts";

/** Read only the public site's IP anchor and location text. Never execute or render its HTML. */
export function readIp138Echo(html: string) {
  const match = html.match(/<a\s+href=["']https:\/\/www\.ip138\.com\/iplookup\.php\?ip=([0-9a-fA-F:.]+)(?:&amp;|&)action=2["'][^>]*>([0-9a-fA-F:.]+)<\/a>/);
  if (!match || match[1] !== match[2]) throw Error("invalid IP138 observation");
  const ip = parseIp(match[1]);
  if (!ip.isPublic) throw Error("invalid IP138 address");
  const place = html.match(/<span>来自[：:]([^<]{1,128})<\/span>/)?.[1];
  const parts = place?.trim().split(/\s+/) ?? [];
  // The public page uses country / province / city / district / carrier. Missing stays missing.
  const location = readEchoGeography({ location: [parts[0], parts[1], parts[2]] }, "ipip");
  return { address: ip.address, location };
}
