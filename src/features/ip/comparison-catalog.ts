import { extraSourceIds, sourceLabels, sourceLinks, type ExtraSourceId, type SourceId } from "../../lib/contracts/ip-sources.ts";
import { comparisonEchoProviders, type EchoId } from "./protocol-probe.ts";

type ComparisonSource = { id: SourceId | EchoId; label: string; href: string; query: SourceId | null; echo: EchoId | null };
const query = (id: SourceId): ComparisonSource => ({ id, label: sourceLabels[id], href: sourceLinks[id], query: id, echo: null });
const echo = (id: EchoId, target: SourceId | null = null): ComparisonSource => {
  const provider = comparisonEchoProviders.find(item => item.id === id)!;
  return { id, label: provider.name, href: target ? sourceLinks[target] : provider.link, query: target, echo: id };
};
/** One ordered list across both homepage protocols and arbitrary-IP queries. */
export const comparisonCatalog = [
  echo("ddnspod"), echo("mir6", "mir6"),
  query("maxmind"), query("ipinfo"), query("ipinfoOnline"), query("ipquery"), query("freeipapi"), query("ipdata"), query("iplocation"),
  echo("ipify"), echo("ident"), echo("icanhazip"), echo("ipleak", "ipleak"), echo("wtfismyip"),
] as const;
export function comparisonPlan(mode: "home" | "lookup") {
  return comparisonCatalog.map(source => ({ ...source, kind: mode === "home" && source.echo ? "echo" as const : source.query ? "query" as const : "unsupported" as const }));
}
/** Homepage echoes already provide these vendors; do not issue duplicate target lookups. */
export const homeGeoSourceIds: readonly ExtraSourceId[] = extraSourceIds.filter(id => !comparisonCatalog.some(source => source.id === id && source.echo));
