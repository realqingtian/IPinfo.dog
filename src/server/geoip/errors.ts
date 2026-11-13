import type { IpErrorCode } from "../../lib/contracts/ip.ts";

/** Public error categories contain no filesystem paths or original exceptions. */
export class GeoIpError extends Error {
  readonly code: IpErrorCode;
  readonly scope?: string;
  constructor(code: IpErrorCode, scope?: string) {
    super(code);
    this.code = code;
    this.scope = scope;
    this.name = "GeoIpError";
  }
}
