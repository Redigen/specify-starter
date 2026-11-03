import type { Browser } from 'playwright-core';
import { PreviewClient, type Viewport } from './client.js';
import { launchChrome } from './chrome.js';
import { ensurePreviewServer, joinRoute } from './server.js';

export interface OpenPageOptions {
  viewport: Viewport;
  theme?: string;
  waitMs: number;
}

/** Shared lifecycle: dev server, Playwright browser and guaranteed teardown. */
export async function withPreview<T>(
  route: string,
  fn: (client: PreviewClient, baseUrl: string) => Promise<T>,
): Promise<T> {
  const server = await ensurePreviewServer();
  let browser: Browser | undefined;
  try {
    browser = await launchChrome();
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const client = new PreviewClient(page);
    await client.navigate(joinRoute(server.baseUrl, route), 0);
    return await fn(client, server.baseUrl);
  } finally {
    await browser?.close();
    server.stop();
  }
}

export async function openAt(
  client: PreviewClient,
  baseUrl: string,
  route: string,
  options: OpenPageOptions,
): Promise<void> {
  await client.setViewport(options.viewport);
  await client.navigate(joinRoute(baseUrl, route), options.waitMs);
  if (options.theme) await client.setTheme(options.theme);
}

export function routeSlug(route: string): string {
  const slug = route.replace(/^\//, '').replaceAll('/', '-');
  return slug || 'home';
}
