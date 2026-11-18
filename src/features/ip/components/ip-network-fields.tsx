"use client";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { usePreferences } from "@/components/providers/preferences";
import type { IpInformation } from "@/lib/contracts/ip";
import { localizedName } from "../presentation";

/** Loading and resolved reports share labels, grid, row heights and separators. */
export function IpNetworkFields({ information, status }: {
  information?: IpInformation | null; status: "ready" | "loading" | "unavailable";
}) {
  const t = useTranslations("App"), { locale } = usePreferences();
  const country = (value: IpInformation["geolocatedCountry"] | undefined) => localizedName(value?.names, locale) || value?.code || t("unknown");
  const rows = [
    [t("asn"), information?.asn ? `AS${information.asn}` : "—"],
    [t("organization"), information?.organization || "—"],
    [t("region"), country(information?.geolocatedCountry)],
    [t("city"), localizedName(information?.city, locale) || "—"],
    [t("registeredCountry"), country(information?.registeredCountry)],
    ...(information?.subdivisions.length ? [[t("subdivisions"), information.subdivisions.map(value => localizedName(value, locale) || "—").join(" / ")]] : []),
  ];
  return <dl className="network-fields report-data" aria-busy={status === "loading"}>
    {rows.map(([label, value], index) => <div className="network-field" key={label}><dt>{label}</dt><dd>
      {status === "loading" ? <Skeleton className={index === 1 ? "report-field-skeleton w-32" : "report-field-skeleton w-20"} /> : status === "unavailable" ? "—" : value}
    </dd></div>)}
  </dl>;
}
