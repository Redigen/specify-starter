import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  flagNumber,
  flagString,
  flagWidthList,
  parseArgs,
} from './args.js';
import { openAt, routeSlug, withPreview } from './session.js';

/** `specify-cli preview shot --path /landing [--widths 390,1440] [--theme dark] --out <file|dir>` */
export async function runPreviewShot(argv: string[]): Promise<void> {
  const { flags } = parseArgs(argv);
  const route = requireRoute(flags);
  const widths = flagWidthList(flags, 'widths', [1440]);
  const height = flagNumber(flags, 'height', 1000);
  const waitMs = flagNumber(flags, 'wait', 1500);
  const theme = flagString(flags, 'theme');
  const fullPage = Boolean(flags['full-page']);
  const selector = flagString(flags, 'selector');
  const out = flagString(flags, 'out', `/tmp/specify-preview/${routeSlug(route)}`);
  const saved: string[] = [];

  await withPreview(route, async (client, baseUrl) => {
    for (const width of widths) {
      await openAt(client, baseUrl, route, {
        viewport: { width, height },
        theme,
        waitMs,
      });
      const file =
        widths.length === 1 && out.endsWith('.png')
          ? resolve(out)
          : resolve(out, `${routeSlug(route)}-${width}${theme ? `-${theme}` : ''}.png`);
      mkdirSync(dirname(file), { recursive: true });
      saved.push(await client.screenshot({ out: file, fullPage, selector }));
    }
  });

  for (const file of saved) {
    process.stdout.write(`[specify-cli] screenshot: ${file}\n`);
  }
}

function requireRoute(flags: Record<string, string | boolean>): string {
  const route = flagString(flags, 'path');
  if (!route) {
    throw new Error('Missing required flag --path (for example --path /landing)');
  }
  return route;
}
