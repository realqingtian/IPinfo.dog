import type { SourceId } from "../../lib/contracts/ip-sources.ts";
import type { ComparisonRows } from "./protocol-probe.ts";

export const regions = ["domestic", "overseas"] as const;
type Region = typeof regions[number];

// Classify the service offering, independently of the IP or location it returns.
// MyIP.la is the international endpoint recommended by IPIP.net.
export const sourceRegion = {
  ip125: "domestic", ipip: "domestic", ddnspod: "domestic", mir6: "domestic",
  maxmind: "overseas", ipinfo: "overseas", ipquery: "overseas",
  freeipapi: "overseas", ipdata: "overseas", iplocation: "overseas",
  ipify: "overseas", ident: "overseas", myipla: "overseas",
  icanhazip: "overseas", ipleak: "overseas", wtfismyip: "overseas",
} satisfies Record<SourceId | Exclude<keyof ComparisonRows, "site">, Region>;
