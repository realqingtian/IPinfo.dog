import { regionFlagCode } from "@/lib/region-flags";
export function RegionFlag({ code }: { code: string | null | undefined }) {
  return <span aria-hidden="true" className={`fi fis fi-${regionFlagCode(code)} shrink-0 rounded-full`} style={{ width: 18, height: 18 }} />;
}
