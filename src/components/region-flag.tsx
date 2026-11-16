import { regionFlagCode } from "@/lib/region-flags";
export function RegionFlag({ code, size = 18 }: { code: string | null | undefined; size?: number }) {
  return <span aria-hidden="true" className={`fi fi-${regionFlagCode(code)} shrink-0`} style={{ width: size * 4 / 3, height: size }} />;
}
