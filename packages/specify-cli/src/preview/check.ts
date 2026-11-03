import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  flagAssertList,
  flagNumber,
  flagString,
  flagWidthList,
  parseArgs,
} from './args.js';
import { checkAnchors, collectAnchors } from './anchors.js';
import { openAt, routeSlug, withPreview } from './session.js';

interface CheckResult {
  name: string;
  pass: boolean;
  details: unknown;
}

interface ViewportReport {
  width: number;
  theme?: string;
  checks: CheckResult[];
}

/** `specify-cli preview check --path /landing [--overflow] [--anchors --spec file] [--assert 'sel:N']` */
export async function runPreviewCheck(argv: string[]): Promise<void> {
  const { flags } = parseArgs(argv);
  const route = flagString(flags, 'path');
  if (!route) throw new Error('Missing required flag --path');

  const widths = flagWidthList(flags, 'widths', [390, 1440]);
  const height = flagNumber(flags, 'height', 1000);
  const waitMs = flagNumber(flags, 'wait', 1500);
  const theme = flagString(flags, 'theme');
  const noOverflow = Boolean(flags.overflow);
  const wantAnchors = Boolean(flags.anchors);
  const specFile = flagString(flags, 'spec');
  const asserts = flagAssertList(flags);
  const screenshots = flagString(flags, 'screenshots');
  const jsonOut = flags.json;

  if (wantAnchors && !specFile) {
    throw new Error('Flag --anchors requires --spec <screen.yaml> to read scroll-to targets');
  }
  if (!noOverflow && !wantAnchors && asserts.length === 0) {
    throw new Error('Nothing to check: pass --overflow, --anchors and/or --assert');
  }

  const anchors = wantAnchors && specFile ? collectAnchors(specFile) : [];
  const reports: ViewportReport[] = [];

  await withPreview(route, async (client, baseUrl) => {
    for (const width of widths) {
      await openAt(client, baseUrl, route, { viewport: { width, height }, theme, waitMs });
      const checks: CheckResult[] = [];

      if (noOverflow) {
        const details = await client.evaluate<{
          innerWidth: number;
          scrollWidth: number;
          offenders: Array<{ tag: string; className: string; right: number }>;
        }>(`(() => {
          const isClipped = (element) => {
            for (let parent = element.parentElement; parent; parent = parent.parentElement) {
              const style = getComputedStyle(parent);
              if (/(hidden|clip|auto|scroll)/.test(style.overflowX)) return true;
            }
            return false;
          };
          const offenders = [...document.querySelectorAll('body *')]
            .filter((element) => {
              const style = getComputedStyle(element);
              const rect = element.getBoundingClientRect();
              return style.display !== 'none' && style.visibility !== 'hidden' &&
                rect.width > 0 && rect.right > window.innerWidth + 1 && !isClipped(element);
            })
            .map((element) => ({
              tag: element.tagName,
              className: String(element.className || '').slice(0, 60),
              right: Math.round(element.getBoundingClientRect().right),
            }))
            .slice(0, 10);
          return {
            innerWidth: window.innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
            offenders,
          };
        })()`);
        checks.push({
          name: 'no-overflow',
          pass: details.scrollWidth <= details.innerWidth && details.offenders.length === 0,
          details,
        });
      }

      for (const assertion of asserts) {
        const separator = assertion.lastIndexOf(':');
        const selector = separator > 0 ? assertion.slice(0, separator) : assertion;
        const expected = separator > 0 ? Number(assertion.slice(separator + 1)) : 1;
        const count = await client.evaluate<number>(
          `document.querySelectorAll(${JSON.stringify(selector)}).length`,
        );
        checks.push({
          name: `assert ${selector}`,
          pass: separator > 0 ? count === expected : count > 0,
          details: { selector, expected, count },
        });
      }

      if (wantAnchors) {
        const details = await checkAnchors(client, anchors);
        checks.push({
          name: 'anchors',
          pass:
            details.missingTargets.length === 0 &&
            details.unreached.length === 0 &&
            details.withoutTrigger.length === 0,
          details,
        });
      }

      const consoleErrors = [...client.consoleErrors];
      checks.push({
        name: 'console-errors',
        pass: consoleErrors.length === 0,
        details: consoleErrors.slice(0, 20),
      });
      client.resetConsoleErrors();

      if (screenshots) {
        const file = `${screenshots}/${routeSlug(route)}-${width}${theme ? `-${theme}` : ''}.png`;
        mkdirSync(dirname(file), { recursive: true });
        await client.screenshot({ out: file, fullPage: true });
        checks.push({ name: 'screenshot', pass: true, details: file });
      }

      reports.push({ width, theme, checks });
    }
  });

  const ok = reports.every((report) => report.checks.every((check) => check.pass));
  for (const report of reports) {
    for (const check of report.checks) {
      const label = check.pass ? 'PASS' : 'FAIL';
      process.stdout.write(
        `[specify-cli] ${label} ${report.width}px ${check.name}${check.pass ? '' : ` ${JSON.stringify(check.details)}`}\n`,
      );
    }
  }

  const payload = { path: route, ok, reports };
  if (typeof jsonOut === 'string') {
    mkdirSync(dirname(jsonOut), { recursive: true });
    writeFileSync(jsonOut, JSON.stringify(payload, null, 2));
    process.stdout.write(`[specify-cli] report: ${jsonOut}\n`);
  } else if (jsonOut) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  }
  if (!ok) process.exitCode = 1;
}
