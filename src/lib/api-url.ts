/** Public service base; local integration overrides are build-time settings only. */
const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.ipinfo.dog";
export function apiUrl(path: string) { return new URL(path, base).href; }
