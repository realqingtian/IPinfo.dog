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
    ['.report-ip', innerWidth < 640 ? '24px' : '30px', '700', innerWidth < 640 ? '30px' : '37.5px'],
    ['h2', '14px', '600', '20px'],
    ['.report-data', '13px', '400', '20px'],
    ['th', '12px', '500', '16px'],
  ];
  for (const [selector, size, weight, lineHeight] of rules) {
    const elements = [...report.querySelectorAll(selector)].filter(visible);
    if (selector !== 'th' && !elements.length) violations.push('Missing typography role: ' + selector);
    if (selector === 'th' && innerWidth >= 768 && report.querySelector('[data-source-comparison]') && elements.length < 5) violations.push('Desktop table labels are missing');
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
  if (innerWidth < 768 && report.querySelector('[data-source-comparison]') && mobileRows !== 3) violations.push('Mobile source layout is incomplete');
  if (report.querySelector('[data-report-summary]')) violations.push('Duplicate summary tiles are present');
  if (document.querySelector('footer a')) violations.push('Footer repeats third-party links');
  return { ready: true, width: innerWidth, violations, typography, overflowing, mobileRows };
}
