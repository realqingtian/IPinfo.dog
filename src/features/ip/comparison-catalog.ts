import { sourceLabels, sourceLinks, type ExtraSourceId, type SourceId } from "../../lib/contracts/ip-sources.ts";
import { comparisonEchoProviders, type EchoId } from "./protocol-probe.ts";

export type ComparisonSource = { id: SourceId | EchoId; label: string; href: string; query: SourceId; echo: EchoId | null; title?: string };
const query = (id: SourceId): ComparisonSource => ({ id, label: sourceLabels[id], href: sourceLinks[id], query: id, echo: null, ...(id === "ipinfo" ? { title: "IPinfo Lite · CC BY-SA 4.0" } : id === "ipdata" ? { title: "IP geolocation by ipdata.co" } : {}) });
const echo = (id: EchoId, target: SourceId): ComparisonSource => {
  const provider = comparisonEchoProviders.find(item => item.id === id)!;
  return { id, label: provider.name, href: sourceLinks[target], query: target, echo: id };
};
/** The only displayed source catalog: every page and loading state preserves its identity/order. */
export const comparisonCatalog = [
  echo("mir6", "mir6"),
  query("maxmind"), query("ipinfo"), query("ipinfoOnline"), query("ipquery"), query("freeipapi"), query("ipdata"), query("iplocation"),
  echo("ipleak", "ipleak"),
] as const;
export function comparisonPlan(mode: "home" | "lookup") {
  return comparisonCatalog.map(source => ({ ...source,
    kind: mode === "home" && source.echo ? "echo" as const : "query" as const,
  }));
}
const queryIds = (mode: "home" | "lookup"): readonly ExtraSourceId[] => comparisonPlan(mode)
  .flatMap(source => source.kind === "query" && source.query && source.query !== "maxmind" ? [source.query] : []);
/** All active requests are derived from the same capabilities; never probe visitors on lookup pages. */
export const homeGeoSourceIds = queryIds("home");
export const lookupGeoSourceIds = queryIds("lookup");
