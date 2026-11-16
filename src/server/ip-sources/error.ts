import type { SourceErrorCode } from "../../lib/contracts/ip-sources.ts";
export class SourceError extends Error {
  code: SourceErrorCode;
  constructor(code: SourceErrorCode) { super(code); this.code = code; }
}
export function safeSourceError(error: unknown): SourceErrorCode {
  return error instanceof SourceError ? error.code : "UNAVAILABLE";
}
