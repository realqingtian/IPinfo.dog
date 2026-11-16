"use client";
import { Building2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { providerIconUrl } from "@/lib/provider-domain";

export function ProviderIcon({ domain }: { domain: string | null }) {
  return <Avatar key={domain ?? "unknown"} className="size-4 shrink-0 rounded-sm after:hidden" aria-hidden data-provider-icon={domain ?? "unavailable"}>
    <AvatarImage src={providerIconUrl(domain) ?? undefined} alt="" className="rounded-none object-contain" referrerPolicy="no-referrer" />
    <AvatarFallback className="rounded-sm"><Building2 className="size-3" /></AvatarFallback>
  </Avatar>;
}
