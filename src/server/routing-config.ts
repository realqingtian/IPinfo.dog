import "server-only";
import { routingTargets } from "../features/routing/catalog";

/** Loopback-only fixtures for browser failure tests, never visitor-controlled. */
export function configuredRoutingTargets() {
  const value = process.env.IPINFO_ROUTING_FIXTURE_ORIGIN;
  if (!value) return routingTargets;
  const url = new URL(value);
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(url.hostname) || url.pathname !== "/" || url.search || url.hash || url.username || url.password) throw new Error("INVALID_ROUTING_FIXTURE");
  return routingTargets.map(target => ({ ...target, url: new URL(`/routing/${target.id}`, url).href }));
}
