import { ArrowUpRight } from "lucide-react";

/** Shared by every comparison row so names and external-link cues stay consistent. */
export function SourceLink({ href, label, title }: { href: string; label: string; title?: string }) {
  const suffix = label.lastIndexOf(".");
  return <a href={href} target="_blank" rel="noreferrer" title={title} translate="no" data-source-link
    className="inline-flex max-w-full items-center gap-1 align-middle underline-offset-4 hover:underline">
    <span className="min-w-0 [overflow-wrap:anywhere]">{suffix > 0 ? <>{label.slice(0, suffix)}<wbr />{label.slice(suffix)}</> : label}</span>
    <ArrowUpRight data-source-link-icon className="size-2.5 shrink-0 text-muted-foreground" aria-hidden />
  </a>;
}
