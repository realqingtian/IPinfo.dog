import countries from "flag-icons/country.json" with { type: "json" };
const supported = new Set(countries.filter(item => item.iso).map(item => item.code));
/** Only library-supported ISO codes reach CSS. Unknown regions keep a neutral placeholder. */
export function regionFlagCode(value: string | null | undefined): string {
  if (typeof value !== "string" || !/^[a-z]{2}$/i.test(value)) return "xx";
  const code = value.toLowerCase(); return supported.has(code) ? code : "xx";
}
