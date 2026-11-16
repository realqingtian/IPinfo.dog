import { regionFlagCode } from "@/lib/region-flags";
export function RegionFlag({ code, size = 18 }: { code: string | null | undefined; size?: number }) {
  return <span aria-hidden="true" className={`fi fis fi-${regionFlagCode(code)} shrink-0 rounded-full`} style={{ width: size, height: size }} />;
}
