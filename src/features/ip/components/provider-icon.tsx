"use client";
import { Building2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { apiUrl } from "@/lib/api-url";

export function ProviderIcon({ domain }: { domain: string }) {
  return <Avatar key={domain} className="size-4 shrink-0 rounded-sm after:hidden" aria-hidden data-provider-icon={domain}>
    <AvatarImage src={apiUrl(`/api/provider-icon?${new URLSearchParams({ domain })}`)} alt="" className="rounded-none object-contain" referrerPolicy="no-referrer" />
    <AvatarFallback className="rounded-sm"><Building2 className="size-3" /></AvatarFallback>
  </Avatar>;
}
