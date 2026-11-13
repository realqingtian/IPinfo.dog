import ipaddr from "ipaddr.js";

export type ParsedIp = {
  address: string;
  family: "ipv4" | "ipv6";
  scope: string;
  isPublic: boolean;
};

const decimalV4 = /^(0|[1-9]\d{0,2})(\.(0|[1-9]\d{0,2})){3}$/;

/** Accept one literal address, never a hostname, CIDR, URL, zone or legacy integer. */
export function parseIp(input: string): ParsedIp {
  const value = input.trim();
  if (!value || value.length > 45 || /[%/\[\]\s]/.test(value)) {
    throw new Error("INVALID_IP");
  }
  if (value.includes(".")) {
    const suffix = value.slice(value.lastIndexOf(":") + 1);
    if (!decimalV4.test(suffix)) throw new Error("INVALID_IP");
  }
  if (!ipaddr.isValid(value) || (!value.includes(":") && !decimalV4.test(value))) {
    throw new Error("INVALID_IP");
  }
  let parsed = ipaddr.parse(value);
  if (parsed instanceof ipaddr.IPv6 && parsed.isIPv4MappedAddress()) {
    parsed = parsed.toIPv4Address();
  }
  const scope = parsed.range();
  return {
    address: parsed.toString(),
    family: parsed.kind(),
    scope,
    isPublic: scope === "unicast",
  };
}
