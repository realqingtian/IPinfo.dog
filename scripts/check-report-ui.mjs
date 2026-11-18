/** Read-only DOM audit. Run in the existing browser tab; never launches a browser. */
export function auditReportUi() {
  const visible = element => {
    const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
      && !(element.classList.contains('sr-only') && rect.width <= 1 && rect.height <= 1);
  };
  const report = [...document.querySelectorAll('[data-result-report]')].find(visible);
  if (!report) return { ready: false, violations: ['Result is not rendered yet'] };
  const violations = [], typography = [];
  const rules = [
    ['.report-ip', innerWidth <= 600 ? '24px' : '30px', '600', innerWidth <= 600 ? '27.6px' : '34.5px'],
    ['h2', '12px', '600', '18px'],
    ['.report-data', '13px', '400', '19.5px'],
    ['th[scope="col"]', '11px', '500', '16.5px'],
  ];
  for (const [selector, size, weight, lineHeight] of rules) {
    const elements = [...report.querySelectorAll(selector)].filter(visible);
    if (selector !== 'th[scope="col"]' && !elements.length) violations.push('Missing typography role: ' + selector);
    if (selector === 'th[scope="col"]' && innerWidth >= 768 && report.querySelector('[data-source-comparison]') && elements.length < 4) violations.push('Desktop table labels are missing');
    for (const element of elements) {
      const actual = getComputedStyle(element);
      const value = { selector, size: actual.fontSize, weight: actual.fontWeight, lineHeight: actual.lineHeight };
      typography.push(value);
      if (value.size !== size || value.weight !== weight || value.lineHeight !== lineHeight) violations.push('Typography mismatch: ' + selector);
    }
  }
  const overflowing = [...document.querySelectorAll('body *')].filter(element => visible(element)
    && !['INPUT', 'TEXTAREA'].includes(element.tagName) && element.clientWidth > 0
    && element.scrollWidth > element.clientWidth + 1).map(element => ({ tag: element.tagName, classes: element.className, client: element.clientWidth, scroll: element.scrollWidth }));
  if (document.documentElement.scrollWidth > innerWidth + 1) violations.push('Page overflows horizontally');
  if (overflowing.length) violations.push('Visible content overflows horizontally');
  const mobileRows = [...report.querySelectorAll('[data-mobile-provider]')].filter(visible).length;
  const expectedRows = +(report.querySelector('[data-source-comparison]')?.getAttribute('data-source-count') || 0);
  if (report.querySelector('[data-source-comparison]') && !(expectedRows > 0)) violations.push('Source count contract is missing');
  if (report.querySelector('[data-source-comparison]')?.getAttribute('data-source-transport') !== 'local-and-browser-direct') violations.push('Local and browser-direct source transport contract is missing');
  if (innerWidth < 768 && expectedRows > 0 && mobileRows !== expectedRows) violations.push('Mobile source layout is incomplete');
  const tables = [...report.querySelectorAll('[data-source-comparison] table')].filter(visible);
  if (tables.length !== 1) violations.push('Expected one visible comparison table');
  const table = tables[0];
  if (table && (table.tBodies.length !== 1 || table.querySelector('[data-source-group], tbody[aria-label]'))) violations.push('Sources must share one continuous table body without category labels');
  if (table && location.pathname === '/ip' && table.querySelector('[data-echo-source]')) violations.push('Lookup includes visitor echoes');

  if (table && table.querySelector("abbr")) violations.push("Source origin labels must not be shown");

  for (const row of table?.querySelectorAll('tbody tr') || []) {
    const link = row.querySelector('td:first-child [data-source-link]');
    const icons = link?.querySelectorAll('[data-source-link-icon]');
    if (!link || icons?.length !== 1 || link.target !== '_blank') violations.push('Source external link cue is missing or inconsistent');
    if (icons?.length === 1) {
      const box = icons[0].getBoundingClientRect(), parent = link.getBoundingClientRect();
      if (box.width !== 10 || box.height !== 10 || box.x < parent.x || box.right > parent.right + 1) violations.push('Source external link icon size or placement is inconsistent');
    }
  }
  if (table && location.pathname === '/') {
    const controls = [...document.querySelectorAll('[data-protocol-switch] [role="radio"]')].filter(visible);
    const selected = controls.filter(control => control.getAttribute('aria-checked') === 'true');
    if (controls.length !== 2 || selected.length !== 1) violations.push('Protocol selector must retain exactly one selection');
    if (controls.length === 2 && selected.length === 1) {
      const inactive = controls.find(control => control !== selected[0]);
      if (getComputedStyle(selected[0]).backgroundColor === getComputedStyle(inactive).backgroundColor) {
        const group = selected[0].closest('[data-protocol-switch]'), indicator = getComputedStyle(group, '::before');
        const button = selected[0].getBoundingClientRect();
        const sharedIndicator = indicator.content !== 'none' && indicator.backgroundColor !== 'rgba(0, 0, 0, 0)'
          && Math.abs(Number.parseFloat(indicator.width) - button.width) <= 1
          && Math.abs(Number.parseFloat(indicator.height) - button.height) <= 1
          && getComputedStyle(selected[0]).color !== getComputedStyle(inactive).color;
        if (!sharedIndicator) violations.push('Selected protocol has no distinct fill or shared indicator');
      }
      if (controls.some(control => {
        const box = control.getBoundingClientRect(), hit = getComputedStyle(control, '::before');
        const height = box.height + (hit.content !== 'none' ? Math.max(0, -(Number.parseFloat(hit.top) || 0)) + Math.max(0, -(Number.parseFloat(hit.bottom) || 0)) : 0);
        return box.width < 44 || height < (innerWidth <= 600 ? 44 : 24);
      })) violations.push('Protocol selector touch target is too small');
    }
  }
  if (table) {
    const rows = [...table.tBodies[0].rows];
    const expected = Number(report.querySelector('[data-source-comparison]')?.getAttribute('data-comparison-count'));
    const identities = rows.map(row => row.getAttribute('data-comparison-source'));
    if (!expected || rows.length !== expected || identities.some(id => !id) || new Set(identities).size !== expected) violations.push('Comparison source catalog is missing, duplicated or incomplete');
    const catalog = report.querySelector('[data-source-comparison]')?.getAttribute('data-comparison-order');
    if (identities.join(',') !== catalog) violations.push('Comparison rows diverge from the shared source catalog');
    if (rows.some(row => row.getAttribute('data-target-capable') !== 'true' || row.getAttribute('data-state') === 'unsupported')) violations.push('Comparison contains an echo-only source or capability placeholder');

    for (const row of rows.filter(row => row.hasAttribute('data-echo-source'))) {
      const address = (row.getAttribute('title') || '').split(' · ')[0];
      const actual = /^[0-9a-f:.]+$/i.test(address) ? address.includes(':') ? 'ipv6' : /^\d+\.\d+\.\d+\.\d+$/.test(address) ? 'ipv4' : null : null;
      if (actual && actual !== row.closest('[data-exit-family]')?.getAttribute('data-exit-family')) violations.push('A comparison address belongs to the opposite protocol');
    }
  }
  const mobileTable = report.querySelector('[data-mobile-sources] table');
  if (innerWidth < 768 && mobileTable && visible(mobileTable)) {
    const heads = [...mobileTable.querySelector('[data-geo-head]').querySelectorAll('th')];
    if (heads.length !== 2) violations.push('Mobile comparison must have shared source and result labels');
    const starts = heads.map(head => head.getBoundingClientRect().x);
    for (const row of mobileTable.querySelectorAll('[data-mobile-provider]')) {
      const cells = [...row.children];
      if (cells.length === 2 && cells.some((cell, index) => Math.abs(cell.getBoundingClientRect().x - starts[index]) > 1)) violations.push('Mobile comparison columns are not aligned');
      if (row.getAttribute('data-state') === 'ready' && (!row.querySelector('[data-source-asn]') || !row.querySelector('.sr-only[title]'))) violations.push('Mobile comparison metadata is missing');
    }
  }
  const reveal = report.querySelector('[data-ip-reveal]');
  if (reveal && (getComputedStyle(reveal).opacity !== '1' || getComputedStyle(reveal).filter !== 'none')) violations.push('Loaded report must appear without a replayed entrance effect');
  if ([...report.querySelectorAll('.ip-source-row[data-state="ready"] > td')].filter(visible).some(cell => getComputedStyle(cell).animationName !== 'none')) violations.push('Loaded source rows must not replay an entrance animation');
  if (report.querySelector('[data-report-summary]')) violations.push('Duplicate summary tiles are present');
  if (document.querySelector('footer a')) violations.push('Footer repeats third-party links');
  for (const row of [...report.querySelectorAll('[data-echo-source][data-location-state="ready"]')].filter(visible)) {
    if (!row.querySelector('[data-echo-location] .fi')) violations.push('Exit location is missing its flag slot');
    if (/\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(row.querySelector('[data-echo-location]')?.textContent || '')) violations.push('Exit location still displays an IP in the location column');
  }
  for (const row of [...report.querySelectorAll('[data-echo-source][data-retryable="true"]')].filter(visible)) {
    if (!row.querySelector('button')) violations.push('Failed comparison source has no retry button');
  }
  if (report.querySelector('[scope="rowgroup"]')) violations.push('Source region must not occupy a separate table row');
  const flags = [...report.querySelectorAll('.fi')].filter(visible).map(element => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height, radius: getComputedStyle(element).borderRadius };
  });
  if (flags.some(flag => Math.abs(flag.width / flag.height - 4 / 3) > 0.01 || flag.radius !== '0px')) violations.push('Flags must use rectangular 4:3 assets');
  const asns = [...report.querySelectorAll('[data-source-asn]')].filter(visible).map(element => element.textContent.trim());
  if (asns.some(asn => asn !== '—' && !/^AS[1-9]\d*$/.test(asn))) violations.push('Source ASN must include AS prefix');
  return { flags, asns, ready: true, width: innerWidth, violations, typography, overflowing, mobileRows };
}


/** Capture each genuine load phase and compare anchors; does not observe or mutate the page. */
export function measureReportAnchor() {
  const visible = element => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; };
  const first = selector => [...document.querySelectorAll(selector)].find(visible);
  const box = selector => { const element = first(selector); if (!element) return null; const r = element.getBoundingClientRect(); return { x: r.x, y: r.y + scrollY, width: r.width, height: r.height }; };
  const report = first('[data-result-report]');
  return { width: innerWidth, phase: first('[data-ip-loading]') ? 'detecting' : report?.getAttribute('data-result-status'),
    toolbar: box('[data-ip-toolbar]'), card: box('main [data-slot="card"]'), address: box('[data-ip-address-slot]'), summary: box('main [data-slot="card-description"]') };
}
