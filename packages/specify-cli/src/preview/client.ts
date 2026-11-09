import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ConsoleMessage, Page } from 'playwright-core';

export interface Viewport {
  width: number;
  height?: number;
  deviceScaleFactor?: number;
  mobile?: boolean;
}

export interface ScreenshotOptions {
  out: string;
  fullPage?: boolean;
  selector?: string;
}

/** Preview operations backed by Playwright's browser and actionability checks. */
export class PreviewClient {
  readonly consoleErrors: string[] = [];

  constructor(private readonly page: Page) {
    page.on('console', (message: ConsoleMessage) => {
      if (message.type() === 'error') this.consoleErrors.push(message.text().split('\n')[0]!);
    });
    page.on('pageerror', (error) => {
      this.consoleErrors.push((error.stack ?? error.message).split('\n')[0]!);
    });
  }

  async evaluate<T>(expression: string): Promise<T> {
    return this.page.evaluate((source) => {
      return (0, eval)(source) as T;
    }, expression) as Promise<T>;
  }

  async setViewport(viewport: Viewport): Promise<void> {
    await this.page.setViewportSize({ width: viewport.width, height: viewport.height ?? 844 });
  }

  resetConsoleErrors(): void {
    this.consoleErrors.length = 0;
  }

  async navigate(url: string, waitMs: number): Promise<void> {
    this.resetConsoleErrors();
    await this.page.goto(url, { waitUntil: 'load', timeout: 20000 });
    await this.evaluate('document.fonts ? document.fonts.ready.then(() => true) : true');
    if (waitMs > 0) await this.page.waitForTimeout(waitMs);
  }

  async waitForSelector(selector: string, timeoutMs = 10000): Promise<void> {
    await this.page.locator(selector).first().waitFor({ state: 'visible', timeout: timeoutMs });
  }

  async setTheme(theme: string): Promise<void> {
    await this.evaluate(
      `(() => { document.documentElement.setAttribute('data-theme', ${JSON.stringify(theme)}); return true; })()`,
    );
    // Let the theme change create its transitions before settling them.
    await this.nextFrame();
    await this.settleAnimations();
  }

  /** Wait for a rendering frame without depending on wall-clock animation time. */
  private async nextFrame(): Promise<void> {
    await this.evaluate(
      'new Promise((resolve) => requestAnimationFrame(() => resolve(true)))',
    );
  }

  /**
   * Finish finite animations so screenshots show their final visual state.
   * Infinite animations are left running and never block preview commands.
   */
  async settleAnimations(): Promise<void> {
    // Finishing one animation can trigger another; settle a bounded cascade.
    for (let pass = 0; pass < 3; pass += 1) {
      const finished = await this.evaluate<number>(`(() => {
        const animations = document.getAnimations({ subtree: true });
        let count = 0;
        for (const animation of animations) {
          if (animation.playState === 'finished') continue;
          const timing = animation.effect?.getComputedTiming();
          if (!timing || timing.iterations === Infinity || !Number.isFinite(timing.endTime)) continue;
          try {
            animation.finish();
            count += 1;
          } catch {
            // An animation may become inactive between collection and finish().
          }
        }
        return count;
      })()`);
      await this.nextFrame();
      if (finished === 0) break;
    }
  }

  async click(selector: string, index = 0): Promise<void> {
    await this.page.locator(selector).nth(index).click({ timeout: 10000 });
  }

  async fill(selector: string, value: string, index = 0): Promise<void> {
    await this.page.locator(selector).nth(index).fill(value, { timeout: 10000 });
  }

  async screenshot(options: ScreenshotOptions): Promise<string> {
    await this.settleAnimations();
    mkdirSync(dirname(options.out), { recursive: true });
    if (options.selector) {
      await this.page.locator(options.selector).first().screenshot({ path: options.out });
    } else {
      await this.page.screenshot({ path: options.out, fullPage: options.fullPage ?? false });
    }
    return options.out;
  }
}
