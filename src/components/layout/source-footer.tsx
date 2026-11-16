export function SourceFooter({ year }: { year: number }) {
  return <footer className="border-t text-xs leading-5 text-muted-foreground" data-source-footer>
    <p className="mx-auto w-full max-w-[1168px] px-3 py-2 sm:px-6" translate="no">© {year} IPinfo.dog</p>
  </footer>;
}
